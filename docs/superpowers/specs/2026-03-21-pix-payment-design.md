# PIX Payment Integration — Design Spec

**Date:** 2026-03-21
**Project:** TarotMístico
**Scope:** Integração de pagamento PIX dinâmico via MercadoPago SDK, webhook de confirmação, e ativação de subscription.

---

## Objetivo

Permitir que usuários paguem R$5/mês via PIX dinâmico gerado pelo MercadoPago, com ativação automática da subscription via webhook. Não inclui renovação automática — o usuário precisará pagar novamente quando o acesso vencer.

---

## Arquitetura e Fluxo

```
Usuário clica "Assinar R$5/mês"
  → POST /api/payment/create
      → MP cria Payment PIX dinâmico
      → retorna { qr_code, qr_code_base64, payment_id, expires_at }
  → Frontend exibe QR Code + copia-e-cola + countdown

Usuário paga no banco
  → MercadoPago chama POST /api/webhook/mercadopago
      → valida assinatura (x-signature header)
      → consulta payment_id no MP
      → se status = "approved" → Subscription.status = "active", expiresAt = now+30d

Usuário acessa /dashboard
  → middleware verifica Subscription.status === "active"
  → se inativo → redireciona para /assinar
```

---

## Modelo de Dados

Novo modelo `Payment` no Prisma:

```prisma
model Payment {
  id           String   @id @default(cuid())
  userId       String
  mpPaymentId  String   @unique
  status       String   @default("pending") // pending, approved, rejected
  amount       Float    @default(5.0)
  qrCode       String
  qrCodeBase64 String
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

`User` ganha `payments Payment[]` no relation.

`Subscription` já existe e não muda estruturalmente — apenas `status` e `expiresAt` são atualizados.

---

## APIs

### `POST /api/payment/create`
- Requer sessão autenticada (NextAuth)
- Cria Payment via SDK MercadoPago com `payment_method_id: "pix"`, `amount: 5.00`, `notification_url`
- Salva `Payment` no DB com status `pending`
- Retorna `{ qr_code, qr_code_base64, expires_at, payment_id }`

### `POST /api/webhook/mercadopago`
- Valida header `x-signature` com `MERCADOPAGO_WEBHOOK_SECRET`
- Recebe `data.id`, consulta status real no MP via SDK
- Se `status === "approved"`:
  - Atualiza `Payment.status = "approved"`
  - Upsert `Subscription`: `status = "active"`, `expiresAt = now + 30 dias`
- Responde `200` imediatamente

### `GET /api/payment/status/[id]`
- Retorna status atual do Payment pelo ID local
- Usado pelo frontend para polling (a cada 5s)

---

## Página `/assinar`

- Botão "Gerar PIX" → chama `POST /api/payment/create`
- Exibe QR Code (imagem base64) + campo copia-e-cola com botão de copiar
- Countdown de 30 minutos para expiração do QR
- Polling a cada 5s em `/api/payment/status/[id]`
- Ao detectar `approved`, redireciona para `/dashboard`
- Design consistente com o tema místico existente

---

## Middleware de Proteção

`middleware.ts` na raiz do projeto protege `/dashboard`:
- Verifica sessão NextAuth
- Verifica `Subscription.status === "active"` (via API interna ou DB direto)
- Redireciona para `/assinar` se inativo

---

## Variáveis de Ambiente

```env
MERCADOPAGO_ACCESS_TOKEN=...   # Token de acesso MP (sandbox para dev)
MERCADOPAGO_WEBHOOK_SECRET=... # Secret para validar x-signature
```

---

## O que NÃO está no escopo

- Renovação automática de assinatura
- Email de cobrança/vencimento
- Painel admin (spec separado)
- Imagens de cartas no chat (spec separado)

---

## Dependências

- `mercadopago` npm package (SDK oficial)
