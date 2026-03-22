import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  default: {
    payment: {
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))
vi.mock('@/lib/mercadopago', () => ({
  mpPayment: {
    create: vi.fn(),
  },
}))

import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'
import { POST } from '@/app/api/payment/create/route'

describe('POST /api/payment/create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/payment/create', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates payment and returns qr_code data', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com' },
    } as any)
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(mpPayment.create).mockResolvedValue({
      id: 'mp-123',
      point_of_interaction: {
        transaction_data: {
          qr_code: 'pix-code',
          qr_code_base64: 'base64data',
        },
      },
      date_of_expiration: '2026-03-21T12:30:00.000Z',
    } as any)
    vi.mocked(prisma.payment.create).mockResolvedValue({
      id: 'local-1',
      mpPaymentId: 'mp-123',
      expiresAt: new Date('2026-03-21T12:30:00Z'),
    } as any)

    const req = new Request('http://localhost/api/payment/create', { method: 'POST' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.qr_code).toBe('pix-code')
    expect(body.qr_code_base64).toBe('base64data')
    expect(body.payment_id).toBe('local-1')
  })
})
