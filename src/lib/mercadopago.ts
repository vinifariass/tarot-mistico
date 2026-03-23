// src/lib/mercadopago.ts
import MercadoPagoConfig, { Payment } from 'mercadopago'

const token = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''

const client = new MercadoPagoConfig({
  accessToken: token,
})

export const mpPayment = new Payment(client)
