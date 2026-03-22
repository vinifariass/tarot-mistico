import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import anthropic from '@/lib/anthropic'
import { buildSystemPrompt, type TarotCard } from '@/lib/consultation'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!consultation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (consultation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (consultation.status !== 'active') {
    return NextResponse.json(
      { error: 'Consulta não está ativa' },
      { status: 400 }
    )
  }
  if (consultation.msgCount >= consultation.maxMsgs) {
    return NextResponse.json(
      { error: 'Limite de mensagens atingido' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { message } = body as { message: string }

  if (!message?.trim() || message.length > 500) {
    return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { consultationId: id, role: 'user', content: message.trim() },
  })

  const newMsgCount = consultation.msgCount + 1

  // Update count (and close if at limit)
  await prisma.consultation.update({
    where: { id },
    data: {
      msgCount: newMsgCount,
      ...(newMsgCount >= consultation.maxMsgs ? { status: 'closed' } : {}),
    },
  })

  const cards = consultation.cards as TarotCard[]
  const systemPrompt = buildSystemPrompt(
    consultation.type,
    cards,
    newMsgCount,
    consultation.maxMsgs
  )

  // Build messages for Claude (history + new user message)
  const history = consultation.messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
  const allMessages = [...history, { role: 'user' as const, content: message.trim() }]

  // Stream response
  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: systemPrompt,
    messages: allMessages,
  })

  let fullResponse = ''

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullResponse += text
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        // Save assistant message after stream completes
        await prisma.chatMessage.create({
          data: { consultationId: id, role: 'assistant', content: fullResponse },
        })
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        // On error, rollback msgCount so user doesn't lose their turn
        await prisma.consultation.update({
          where: { id },
          data: {
            msgCount: consultation.msgCount,
            status: consultation.status,
          },
        })
        controller.error(err)
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
