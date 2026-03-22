import prisma from '@/lib/prisma'

export async function activateSubscription(userId: string): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + 30)

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: 'active',
      paidAt: now,
      expiresAt,
    },
    create: {
      userId,
      status: 'active',
      paidAt: now,
      expiresAt,
    },
  })
}
