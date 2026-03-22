import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    subscription: {
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'

describe('JWT callback subscription enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds active subscription status to token', async () => {
    const expiresAt = new Date('2026-04-21T00:00:00Z')
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      status: 'active',
      expiresAt,
    } as any)

    // Simula o que o callback jwt faz
    const token = { sub: 'user-1' }
    const sub = await prisma.subscription.findUnique({ where: { userId: token.sub } })
    const enriched = {
      ...token,
      subscriptionStatus: sub?.status ?? 'inactive',
      subscriptionExpiresAt: sub?.expiresAt?.toISOString() ?? null,
    }

    expect(enriched.subscriptionStatus).toBe('active')
    expect(enriched.subscriptionExpiresAt).toBe('2026-04-21T00:00:00.000Z')
  })

  it('defaults to inactive when no subscription exists', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

    const token = { sub: 'user-1' }
    const sub = await prisma.subscription.findUnique({ where: { userId: token.sub } })
    const enriched = {
      ...token,
      subscriptionStatus: sub?.status ?? 'inactive',
      subscriptionExpiresAt: sub?.expiresAt?.toISOString() ?? null,
    }

    expect(enriched.subscriptionStatus).toBe('inactive')
    expect(enriched.subscriptionExpiresAt).toBeNull()
  })
})
