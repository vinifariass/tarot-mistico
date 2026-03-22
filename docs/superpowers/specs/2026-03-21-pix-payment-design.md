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
      → salva Payment no DB (status: pending, expiresAt: now+30min)
      → retorna { qr_code, qr_code_base64, payment_id, expires_at }
  → Frontend exibe QR Code + copia-e-cola + countdown 30min

Usuário paga no banco
  → MercadoPago chama POST /api/webhook/mercadopago
      → valida assinatura x-signature (HMAC-SHA256)
      → se Payment já está approved → retorna 200 (idempotência)
      → consulta payment real no MP via SDK
      → se status = "approved":
          → Payment.status = "approved"
          → Subscription: status = "active", paidAt = now, expiresAt = now+30d
      → responde 200 imediatamente

Usuário acessa /dashboard
  → middleware.ts verifica sessão NextAuth
  → subscription_status no JWT (via NextAuth jwt callback) deve ser "active"
  → E subscription_expires_at no JWT deve ser > now
  → se inativo ou vencido → redireciona para /assinar
```

---

## Modelo de Dados

Novo modelo `Payment` no Prisma:

```prisma
model Payment {
  id           String   @id @default(cuid())
  userId       String
  mpPaymentId  String   @unique
  status       String   @default("pending") // pending, approved, rejected, expired
  amount       Decimal  @default(5.00)       // Decimal para evitar floating-point em dinheiro
  qrCode       String
  qrCodeBase64 String
  expiresAt    DateTime                       // now + 30 minutos (expiração do QR)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

`User` ganha `payments Payment[]` no relation.

`Subscription` não muda estruturalmente. Os campos `paidAt` e `pixKey` são atualizados quando um pagamento é aprovado:
- `paidAt` = timestamp do pagamento aprovado
- `pixKey` = não é mais usado (mantido por compatibilidade, não escrito pelo novo fluxo)
- `status` = `"active"`
- `expiresAt` = now + 30 dias

---

## APIs

### `POST /api/payment/create`
- Requer sessão autenticada (NextAuth)
- Se o usuário já tem um `Payment` com status `pending` e `expiresAt > now`, cancela/ignora o anterior e cria um novo (evitar acúmulo indefinido de pendings)
- Cria Payment via SDK MercadoPago:
  - `payment_method_id: "pix"`
  - `transaction_amount: 5.00`
  - `notification_url: ${NEXT_PUBLIC_BASE_URL}/api/webhook/mercadopago`
- Salva `Payment` no DB: `status: "pending"`, `expiresAt: now + 30min`
- Retorna:
```json
{
  "payment_id": "string",
  "qr_code": "string",
  "qr_code_base64": "string",
  "expires_at": "ISO8601"
}
```

### `POST /api/webhook/mercadopago`
- **Não requer** autenticação de sessão (é chamado pelo MP, não pelo browser)
- Valida header `x-signature` usando o algoritmo oficial do MercadoPago:
  1. Extrai `ts` e `v1` do header `x-signature` (formato: `ts=...;v1=...`)
  2. Extrai `data_id` do query param `data.id`
  3. Constrói o manifesto: `"id:{data_id};request-id:{x-request-id};ts:{ts};"`
  4. Computa HMAC-SHA256 do manifesto com `MERCADOPAGO_WEBHOOK_SECRET`
  5. Compara com `v1` — rejeita com 400 se inválido
- **Idempotência:** busca o `Payment` pelo `mpPaymentId`. Se `status` já é `"approved"`, retorna 200 imediatamente sem reprocessar.
- Consulta status real do Payment no MP via SDK (`payment.get(mpPaymentId)`)
- Se `status === "approved"`:
  - Atualiza `Payment.status = "approved"`
  - Upsert `Subscription`: `status = "active"`, `paidAt = now`, `expiresAt = now + 30 dias`
  - Atualiza o JWT do usuário via NextAuth (subscription_status e subscription_expires_at são re-lidos no próximo `jwt` callback)
- Responde `200` imediatamente (MP re-tenta se não receber 200 em tempo hábil)

### `GET /api/payment/status/[id]`
- Requer sessão autenticada
- Valida que o `Payment.userId === session.user.id` (ownership check)
- Se `Payment.expiresAt < now` e `status === "pending"`: atualiza para `"expired"` e retorna
- Retorna:
```json
{
  "status": "pending" | "approved" | "rejected" | "expired"
}
```

---

## Middleware de Proteção (`middleware.ts`)

Next.js Edge Middleware não suporta Prisma/Node.js nativo. A subscription status é armazenada no JWT via NextAuth callback:

```ts
// em [...nextauth].ts
callbacks: {
  async jwt({ token, trigger }) {
    // Re-busca subscription do DB a cada login ou quando trigger === "update"
    if (token.sub) {
      const sub = await prisma.subscription.findUnique({ where: { userId: token.sub } })
      token.subscriptionStatus = sub?.status ?? "inactive"
      token.subscriptionExpiresAt = sub?.expiresAt?.toISOString() ?? null
    }
    return token
  },
  async session({ session, token }) {
    session.subscriptionStatus = token.subscriptionStatus
    session.subscriptionExpiresAt = token.subscriptionExpiresAt
    return session
  }
}
```

`middleware.ts` lê o JWT (via `getToken`) e redireciona se:
- `subscriptionStatus !== "active"`, **ou**
- `subscriptionExpiresAt` está no passado

---

## Página `/assinar`

- Botão "Gerar PIX" → `POST /api/payment/create`
- Se já existe um pagamento pending em sessão, exibe o QR existente (sem gerar novo)
- Exibe QR Code (imagem base64) + campo copia-e-cola com botão de copiar
- Countdown de 30 minutos baseado em `expires_at` retornado pela API
- Polling a cada 5s em `GET /api/payment/status/[id]`
- Ao detectar `status === "approved"`, chama `update()` do NextAuth session e redireciona para `/dashboard`
- Ao detectar `status === "expired"`, exibe botão "Gerar novo PIX"
- Design consistente com o tema místico existente

---

## Variáveis de Ambiente

```env
MERCADOPAGO_ACCESS_TOKEN=...    # Token de acesso MP (TEST-xxx para sandbox, APP_USR-xxx para prod)
MERCADOPAGO_WEBHOOK_SECRET=...  # Secret para validar x-signature
NEXT_PUBLIC_BASE_URL=...        # Ex: https://meusite.vercel.app (usado na notification_url)
```

**Desenvolvimento local:** MercadoPago não consegue chamar `localhost`. É necessário um tunnel (ngrok ou localtunnel) para testar webhooks. `NEXT_PUBLIC_BASE_URL` deve apontar para a URL do tunnel durante o desenvolvimento.

---

## O que NÃO está no escopo

- Renovação automática de assinatura
- Email de cobrança/vencimento
- Painel admin (spec separado)
- Imagens de cartas no chat (spec separado)

---

## Dependências

- `mercadopago` npm package (SDK oficial)
