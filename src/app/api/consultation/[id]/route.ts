import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
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
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!consultation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (consultation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Lazy expiry check
  if (
    consultation.status === 'active' &&
    consultation.expiresAt &&
    consultation.expiresAt < new Date()
  ) {
    await prisma.consultation.update({
      where: { id },
      data: { status: 'closed' },
    })
    return NextResponse.json({ ...consultation, status: 'closed' })
  }

  return NextResponse.json(consultation)
}
