import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  default: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { GET } from '@/app/api/payment/status/[id]/route'

const makeReq = (id: string) =>
  new Request(`http://localhost/api/payment/status/${id}`)

describe('GET /api/payment/status/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await GET(makeReq('p1'), { params: Promise.resolve({ id: 'p1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when payment not found or not owned', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)
    const res = await GET(makeReq('p1'), { params: Promise.resolve({ id: 'p1' }) })
    expect(res.status).toBe(404)
  })

  it('marks expired when past expiresAt', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      status: 'pending',
      expiresAt: new Date('2020-01-01'),
    } as any)
    vi.mocked(prisma.payment.update).mockResolvedValue({ status: 'expired' } as any)

    const res = await GET(makeReq('p1'), { params: Promise.resolve({ id: 'p1' }) })
    const body = await res.json()
    expect(body.status).toBe('expired')
  })

  it('returns current status for non-expired payment', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      status: 'approved',
      expiresAt: new Date(Date.now() + 60000),
    } as any)

    const res = await GET(makeReq('p1'), { params: Promise.resolve({ id: 'p1' }) })
    const body = await res.json()
    expect(body.status).toBe('approved')
  })
})
