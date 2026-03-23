import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ authOptions: {} }))

vi.mock('@/lib/prisma', () => ({
  default: {
    payment: { updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    consultation: { create: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/mercadopago', () => ({
  mpPayment: { create: vi.fn() },
}))

import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'
import { POST } from '@/app/api/consultation/start/route'

const mockSession = { user: { id: 'user-1', email: 'a@b.com' } }
const mockMpResponse = {
  id: 'mp-123',
  point_of_interaction: {
    transaction_data: { qr_code: 'qr', qr_code_base64: 'b64' },
  },
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/consultation/start', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ type: 'familia' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid consultation type', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ type: 'invalid' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates consultation and returns payment data on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(mpPayment.create).mockResolvedValue(mockMpResponse as any)
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'pay-1' } as any)
    vi.mocked(prisma.consultation.create).mockResolvedValue({ id: 'con-1' } as any)
    vi.mocked(prisma.payment.update).mockResolvedValue({} as any)

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ type: 'familia' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('consultationId')
    expect(data).toHaveProperty('qr_code')
  })
})
