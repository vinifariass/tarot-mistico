import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    subscription: {
      upsert: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { activateSubscription } from '@/lib/subscription'

describe('activateSubscription', () => {
  beforeEach(() => vi.clearAllMocks())

  it('upserts subscription with active status and 30-day expiry', async () => {
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as any)

    const before = new Date()
    await activateSubscription('user-1')
    const after = new Date()

    expect(prisma.subscription.upsert).toHaveBeenCalledOnce()
    const call = vi.mocked(prisma.subscription.upsert).mock.calls[0][0]

    expect(call.where).toEqual({ userId: 'user-1' })

    // Verifica campos do update
    expect(call.update.status).toBe('active')
    expect(call.update.paidAt).toBeInstanceOf(Date)
    const expiresAt = call.update.expiresAt as Date
    const diffDays = (expiresAt.getTime() - before.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(29.9)
    expect(diffDays).toBeLessThanOrEqual(30.1)

    // Verifica campos do create (caso subscription não exista ainda)
    expect(call.create.userId).toBe('user-1')
    expect(call.create.status).toBe('active')
    expect(call.create.paidAt).toBeInstanceOf(Date)
    expect(call.create.expiresAt).toBeInstanceOf(Date)
  })
})
