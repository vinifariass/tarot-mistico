import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'
import { activateSubscription } from '@/lib/subscription'
import { activateConsultation } from '@/lib/consultation'

function validateSignature(req: Request, dataId: string): boolean {
  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET!

  const parts = Object.fromEntries(
    xSignature.split(';').map((p) => p.split('=') as [string, string])
  )
  const { ts, v1 } = parts
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  // IMPORTANT: decode both as hex before comparing.
  // Buffer.from(str) uses UTF-8, producing different lengths and causing
  // timingSafeEqual to throw a RangeError on length mismatch.
  const vBuf = Buffer.from(v1, 'hex')
  const eBuf = Buffer.from(expected, 'hex')
  if (vBuf.length !== eBuf.length) return false
  return crypto.timingSafeEqual(vBuf, eBuf)
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') ?? ''

  if (!validateSignature(req, dataId)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payment = await prisma.payment.findUnique({
    where: { mpPaymentId: dataId },
  })

  if (!payment) {
    // Pagamento não encontrado no nosso DB — responder 200 para o MP não retentar
    return NextResponse.json({ ok: true })
  }

  // Idempotência: já processado
  if (payment.status === 'approved') {
    return NextResponse.json({ ok: true })
  }

  // Consulta status real no MP
  const mpStatus = await mpPayment.get({ id: dataId })

  if (mpStatus.status === 'approved') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'approved' },
    })
    if (payment.consultationId) {
      await activateConsultation(payment.consultationId)
    } else {
      await activateSubscription(payment.userId)
    }
  }

  return NextResponse.json({ ok: true })
}
