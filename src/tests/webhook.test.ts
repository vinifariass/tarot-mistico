import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

vi.mock('@/lib/prisma', () => ({
  default: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/lib/subscription', () => ({
  activateSubscription: vi.fn(),
}))
vi.mock('@/lib/mercadopago', () => ({
  mpPayment: {
    get: vi.fn(),
  },
}))

import prisma from '@/lib/prisma'
import { activateSubscription } from '@/lib/subscription'
import { mpPayment } from '@/lib/mercadopago'
import { POST } from '@/app/api/webhook/mercadopago/route'

const WEBHOOK_SECRET = 'test-secret'

function makeSignedRequest(body: object, dataId: string) {
  const ts = Date.now().toString()
  const requestId = 'req-123'
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex')

  return new Request(
    `http://localhost/api/webhook/mercadopago?data.id=${dataId}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': `ts=${ts};v1=${signature}`,
        'x-request-id': requestId,
      },
      body: JSON.stringify(body),
    }
  )
}

describe('POST /api/webhook/mercadopago', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MERCADOPAGO_WEBHOOK_SECRET = WEBHOOK_SECRET
  })

  it('returns 400 on invalid signature', async () => {
    // Use a valid 64-char hex string (wrong value) so Buffer.from(v1, 'hex')
    // produces a 32-byte buffer matching the expected length — ensuring
    // timingSafeEqual compares values rather than throwing on length mismatch.
    const wrongSig = 'a'.repeat(64)
    const req = new Request('http://localhost/api/webhook/mercadopago?data.id=123', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': `ts=1234;v1=${wrongSig}`,
        'x-request-id': 'req-1',
      },
      body: JSON.stringify({ type: 'payment', data: { id: '123' } }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 idempotently if payment already approved', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'local-1',
      userId: 'user-1',
      status: 'approved',
    } as any)

    const req = makeSignedRequest({ type: 'payment', data: { id: 'mp-123' } }, 'mp-123')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(activateSubscription).not.toHaveBeenCalled()
  })

  it('activates subscription on approved payment', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'local-1',
      userId: 'user-1',
      status: 'pending',
    } as any)
    vi.mocked(mpPayment.get).mockResolvedValue({ status: 'approved' } as any)
    vi.mocked(prisma.payment.update).mockResolvedValue({} as any)
    vi.mocked(activateSubscription).mockResolvedValue()

    const req = makeSignedRequest({ type: 'payment', data: { id: 'mp-123' } }, 'mp-123')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(activateSubscription).toHaveBeenCalledWith('user-1')
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'local-1' },
      data: { status: 'approved' },
    })
  })
})
