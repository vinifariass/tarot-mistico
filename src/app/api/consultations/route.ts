import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const consultations = await prisma.consultation.findMany({
    where: {
      userId: session.user.id,
      status: { in: ['active', 'closed'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      status: true,
      msgCount: true,
      maxMsgs: true,
      createdAt: true,
    },
  })

  return NextResponse.json(consultations)
}
