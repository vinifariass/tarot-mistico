import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Cancela pagamentos pending anteriores (evita acúmulo)
  await prisma.payment.updateMany({
    where: { userId, status: 'pending' },
    data: { status: 'expired' },
  })

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // +30 minutos

  const mpResponse = await mpPayment.create({
    body: {
      transaction_amount: 5.0,
      payment_method_id: 'pix',
      payer: { email: session.user.email! },
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/mercadopago`,
      date_of_expiration: expiresAt.toISOString(),
      description: 'TarotMístico — Assinatura mensal',
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
      amount: 5.0,
      qrCode: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      expiresAt,
    },
  })

  return NextResponse.json({
    payment_id: payment.id,
    qr_code: txData.qr_code,
    qr_code_base64: txData.qr_code_base64,
    expires_at: expiresAt.toISOString(),
  })
}
