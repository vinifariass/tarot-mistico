import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const payment = await prisma.payment.findUnique({
    where: { id },
  })

  if (!payment || payment.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Marca como expired se passou o tempo
  if (payment.status === 'pending' && payment.expiresAt < new Date()) {
    await prisma.payment.update({
      where: { id },
      data: { status: 'expired' },
    })
    return NextResponse.json({ status: 'expired' })
  }

  return NextResponse.json({ status: payment.status })
}
