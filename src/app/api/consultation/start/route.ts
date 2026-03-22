import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'

const PRICES: Record<string, number> = {
  familia: 3.0,
  trabalho: 3.0,
  relacionamento: 5.0,
}

const DESCRIPTIONS: Record<string, string> = {
  familia: 'TarotMístico — Consulta Família',
  trabalho: 'TarotMístico — Consulta Trabalho',
  relacionamento: 'TarotMístico — Consulta Relacionamento',
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, expiresAt: true },
  })
  if (
    !subscription ||
    subscription.status !== 'active' ||
    (subscription.expiresAt && subscription.expiresAt < new Date())
  ) {
    return NextResponse.json(
      { error: 'Assinatura inativa. Assine para continuar.' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { type } = body as { type: string }

  if (!PRICES[type]) {
    return NextResponse.json(
      { error: 'Tipo de consulta inválido' },
      { status: 400 }
    )
  }

  await prisma.payment.updateMany({
    where: { userId, status: 'pending' },
    data: { status: 'expired' },
  })

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

  const mpResponse = await mpPayment.create({
    body: {
      transaction_amount: PRICES[type],
      payment_method_id: 'pix',
      payer: { email: session.user.email! },
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/mercadopago`,
      date_of_expiration: expiresAt.toISOString(),
      description: DESCRIPTIONS[type],
    },
  })

  const txData = mpResponse.point_of_interaction?.transaction_data
  if (!txData?.qr_code || !txData?.qr_code_base64) {
    return NextResponse.json({ error: 'Falha ao gerar QR Code' }, { status: 500 })
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      mpPaymentId: String(mpResponse.id),
      status: 'pending',
      amount: PRICES[type],
      qrCode: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      expiresAt,
    },
  })

  const consultation = await prisma.consultation.create({
    data: {
      userId,
      type,
      status: 'pending_payment',
      paymentId: payment.id,
    },
  })

  await prisma.payment.update({
    where: { id: payment.id },
    data: { consultationId: consultation.id },
  })

  return NextResponse.json({
    consultationId: consultation.id,
    payment_id: payment.id,
    qr_code: txData.qr_code,
    qr_code_base64: txData.qr_code_base64,
    expires_at: expiresAt.toISOString(),
  })
}
