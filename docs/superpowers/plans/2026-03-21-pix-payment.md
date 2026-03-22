# PIX Payment Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar PIX dinâmico via MercadoPago para liberar acesso ao TarotMístico após pagamento de R$5, com ativação automática de subscription via webhook.

**Architecture:** O frontend gera um QR Code via `/api/payment/create`, polling em `/api/payment/status/[id]` detecta aprovação. O MercadoPago chama `/api/webhook/mercadopago` ao confirmar o pagamento, que valida a assinatura HMAC-SHA256 e ativa a subscription no banco. O status da subscription é armazenado no JWT do NextAuth para que o middleware Edge possa proteger `/dashboard` sem acessar o banco.

**Tech Stack:** Next.js 15, NextAuth v4 (JWT strategy), Prisma 6 + SQLite (dev), MercadoPago SDK (`mercadopago`), Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-03-21-pix-payment-design.md`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `prisma/schema.prisma` | Modificar | Adicionar modelo `Payment`, relation em `User` |
| `src/types/next-auth.d.ts` | Modificar | Adicionar `subscriptionStatus` e `subscriptionExpiresAt` no JWT e Session |
| `src/lib/auth.ts` | Modificar | Estender callbacks `jwt` e `session` com subscription |
| `src/lib/mercadopago.ts` | Criar | Instância singleton do SDK MercadoPago |
| `src/lib/subscription.ts` | Criar | Função `activateSubscription(userId)` |
| `src/app/api/payment/create/route.ts` | Criar | Gera QR Code PIX no MP, salva Payment no DB |
| `src/app/api/payment/status/[id]/route.ts` | Criar | Retorna status do Payment (com ownership check) |
| `src/app/api/webhook/mercadopago/route.ts` | Criar | Valida assinatura MP, ativa subscription |
| `src/app/assinar/page.tsx` | Criar | Página de assinatura com QR Code + polling |
| `middleware.ts` | Criar | Protege `/dashboard` via JWT (Edge Runtime) |
| `.env.example` | Modificar | Adicionar `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `NEXT_PUBLIC_BASE_URL` |
| `src/tests/webhook.test.ts` | Criar | Testes do handler webhook |
| `src/tests/payment-create.test.ts` | Criar | Testes da API de criação de pagamento |
| `src/tests/payment-status.test.ts` | Criar | Testes da API de status |
| `src/tests/subscription.test.ts` | Criar | Testes da função activateSubscription |

---

## Task 1: Configurar ambiente de testes (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar Vitest e dependências**

```bash
cd C:/tmp/tarot-mistico
npm install --save-dev vitest @vitest/coverage-v8 @types/node
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Adicionar script `test` no `package.json`**

No campo `"scripts"`, adicionar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que Vitest funciona**

```bash
cd C:/tmp/tarot-mistico
npx vitest run
```

Esperado: `No test files found` (sem erro de configuração).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test setup"
```

---

## Task 2: Instalar SDK MercadoPago e atualizar variáveis de ambiente

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env.local`

- [ ] **Step 1: Instalar SDK**

```bash
cd C:/tmp/tarot-mistico
npm install mercadopago
```

- [ ] **Step 2: Atualizar `.env.example`**

Substituir o bloco `# PIX / Pagamentos` por:

```env
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx   # Use TEST-xxx para sandbox
MERCADOPAGO_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Em prod: https://seusite.vercel.app
                                            # Em dev com webhook: URL do ngrok/localtunnel
```

- [ ] **Step 3: Adicionar as mesmas variáveis ao `.env.local`**

Adicionar no final do arquivo:
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx
MERCADOPAGO_WEBHOOK_SECRET=dev-webhook-secret-qualquer
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> **Nota:** Para testar webhooks localmente, substitua `NEXT_PUBLIC_BASE_URL` pela URL gerada pelo ngrok: `npx ngrok http 3000`

- [ ] **Step 4: Commit**

```bash
git add .env.example package.json package-lock.json
git commit -m "chore: install mercadopago SDK, update env vars"
```

---

## Task 3: Atualizar schema Prisma com modelo Payment

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar modelo `Payment` e relation no `User`**

No final do arquivo `prisma/schema.prisma`, adicionar:

```prisma
model Payment {
  id           String   @id @default(cuid())
  userId       String
  mpPaymentId  String   @unique
  status       String   @default("pending") // pending, approved, rejected, expired
  amount       Decimal  @default(5.00)
  qrCode       String
  qrCodeBase64 String
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

No modelo `User`, adicionar a relation:
```prisma
payments     Payment[]
```

- [ ] **Step 2: Rodar a migration**

```bash
cd C:/tmp/tarot-mistico
npx prisma migrate dev --name add_payment_model
```

Esperado: migration criada e aplicada sem erros.

- [ ] **Step 3: Regenerar o Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 4: Verificar no Prisma Studio (opcional)**

```bash
npx prisma studio
```

Confirmar que a tabela `Payment` aparece.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Payment model to schema"
```

---

## Task 4: Estender tipos NextAuth com subscription

**Files:**
- Modify: `src/types/next-auth.d.ts`

- [ ] **Step 1: Adicionar campos de subscription ao JWT e Session**

Substituir o conteúdo de `src/types/next-auth.d.ts` por:

```ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    subscriptionStatus: string;
    subscriptionExpiresAt: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: string | null;
  }
}
```

- [ ] **Step 2: Verificar tipos com TypeScript**

```bash
cd C:/tmp/tarot-mistico
npx tsc --noEmit
```

Esperado: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add src/types/next-auth.d.ts
git commit -m "feat: extend NextAuth types with subscription fields"
```

---

## Task 5: Estender callbacks JWT/session em `auth.ts`

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Escrever o teste**

Criar `src/tests/auth-callbacks.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    subscription: {
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'

describe('JWT callback subscription enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds active subscription status to token', async () => {
    const expiresAt = new Date('2026-04-21T00:00:00Z')
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      status: 'active',
      expiresAt,
    } as any)

    // Simula o que o callback jwt faz
    const token = { sub: 'user-1' }
    const sub = await prisma.subscription.findUnique({ where: { userId: token.sub } })
    const enriched = {
      ...token,
      subscriptionStatus: sub?.status ?? 'inactive',
      subscriptionExpiresAt: sub?.expiresAt?.toISOString() ?? null,
    }

    expect(enriched.subscriptionStatus).toBe('active')
    expect(enriched.subscriptionExpiresAt).toBe('2026-04-21T00:00:00.000Z')
  })

  it('defaults to inactive when no subscription exists', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

    const token = { sub: 'user-1' }
    const sub = await prisma.subscription.findUnique({ where: { userId: token.sub } })
    const enriched = {
      ...token,
      subscriptionStatus: sub?.status ?? 'inactive',
      subscriptionExpiresAt: sub?.expiresAt?.toISOString() ?? null,
    }

    expect(enriched.subscriptionStatus).toBe('inactive')
    expect(enriched.subscriptionExpiresAt).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que já passa (smoke test)**

```bash
cd C:/tmp/tarot-mistico
npx vitest run src/tests/auth-callbacks.test.ts
```

Esperado: PASS.

> **Nota:** Este teste valida a lógica de enriquecimento do token de forma isolada (sem importar `auth.ts`). Ele não segue o ciclo red-green clássico do TDD — seu valor é de documentação e sanidade da lógica pura. A regressão real ocorre nos testes de integração manual no Step 3.

- [ ] **Step 3: Atualizar `src/lib/auth.ts` — callbacks**

Substituir os callbacks existentes por:

```ts
callbacks: {
  async jwt({ token, user, trigger }) {
    if (user) token.id = user.id;

    // Atualiza subscription no token APENAS no login ou quando forçado via update()
    // IMPORTANTE: A spec mostra uma query incondicional no pseudocódigo, mas isso
    // chamaria o banco em TODA renderização de página via JWT callback.
    // O guard `user || trigger === 'update'` é a implementação correta e intencional.
    if (user || trigger === 'update') {
      const userId = token.id as string | undefined ?? token.sub;
      if (userId) {
        const sub = await prisma.subscription.findUnique({
          where: { userId },
          select: { status: true, expiresAt: true },
        });
        token.subscriptionStatus = sub?.status ?? 'inactive';
        token.subscriptionExpiresAt = sub?.expiresAt?.toISOString() ?? null;
      }
    }

    return token;
  },
  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id as string;
    }
    session.subscriptionStatus = (token.subscriptionStatus as string) ?? 'inactive';
    session.subscriptionExpiresAt = (token.subscriptionExpiresAt as string | null) ?? null;
    return session;
  },
},
```

> **Atenção:** O import do `PrismaClient` no topo de `auth.ts` usa `new PrismaClient()`. Substituir por `import prisma from '@/lib/prisma'` para usar o singleton.

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/tests/auth-callbacks.test.ts
git commit -m "feat: add subscription status to NextAuth JWT and session"
```

---

## Task 6: Criar `src/lib/mercadopago.ts` (singleton SDK)

**Files:**
- Create: `src/lib/mercadopago.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
// src/lib/mercadopago.ts
import MercadoPagoConfig, { Payment } from 'mercadopago'

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is not set')
}

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

export const mpPayment = new Payment(client)
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/mercadopago.ts
git commit -m "feat: add MercadoPago SDK singleton"
```

---

## Task 7: Criar `src/lib/subscription.ts`

**Files:**
- Create: `src/lib/subscription.ts`
- Create: `src/tests/subscription.test.ts`

- [ ] **Step 1: Escrever o teste**

```ts
// src/tests/subscription.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    subscription: {
      upsert: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { activateSubscription } from '@/lib/subscription'

describe('activateSubscription', () => {
  beforeEach(() => vi.clearAllMocks())

  it('upserts subscription with active status and 30-day expiry', async () => {
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as any)

    const before = new Date()
    await activateSubscription('user-1')
    const after = new Date()

    expect(prisma.subscription.upsert).toHaveBeenCalledOnce()
    const call = vi.mocked(prisma.subscription.upsert).mock.calls[0][0]

    expect(call.where).toEqual({ userId: 'user-1' })

    // Verifica campos do update
    expect(call.update.status).toBe('active')
    expect(call.update.paidAt).toBeInstanceOf(Date)
    const expiresAt: Date = call.update.expiresAt
    const diffDays = (expiresAt.getTime() - before.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(29.9)
    expect(diffDays).toBeLessThanOrEqual(30.1)

    // Verifica campos do create (caso subscription não exista ainda)
    expect(call.create.userId).toBe('user-1')
    expect(call.create.status).toBe('active')
    expect(call.create.paidAt).toBeInstanceOf(Date)
    expect(call.create.expiresAt).toBeInstanceOf(Date)
  })
})
```

- [ ] **Step 2: Rodar teste para verificar que falha**

```bash
npx vitest run src/tests/subscription.test.ts
```

Esperado: FAIL (`Cannot find module '@/lib/subscription'`).

- [ ] **Step 3: Implementar `activateSubscription`**

```ts
// src/lib/subscription.ts
import prisma from '@/lib/prisma'

export async function activateSubscription(userId: string): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + 30)

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: 'active',
      paidAt: now,
      expiresAt,
    },
    create: {
      userId,
      status: 'active',
      paidAt: now,
      expiresAt,
    },
  })
}
```

- [ ] **Step 4: Rodar teste para verificar que passa**

```bash
npx vitest run src/tests/subscription.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/subscription.ts src/tests/subscription.test.ts
git commit -m "feat: add activateSubscription helper"
```

---

## Task 8: API `POST /api/payment/create`

**Files:**
- Create: `src/app/api/payment/create/route.ts`
- Create: `src/tests/payment-create.test.ts`

- [ ] **Step 1: Escrever os testes**

```ts
// src/tests/payment-create.test.ts
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
```

- [ ] **Step 2: Rodar teste para verificar que falha**

```bash
npx vitest run src/tests/payment-create.test.ts
```

Esperado: FAIL.

- [ ] **Step 3: Implementar a rota**

```ts
// src/app/api/payment/create/route.ts
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
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
npx vitest run src/tests/payment-create.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/create/route.ts src/tests/payment-create.test.ts
git commit -m "feat: add POST /api/payment/create endpoint"
```

---

## Task 9: API `GET /api/payment/status/[id]`

**Files:**
- Create: `src/app/api/payment/status/[id]/route.ts`
- Create: `src/tests/payment-status.test.ts`

- [ ] **Step 1: Escrever os testes**

```ts
// src/tests/payment-status.test.ts
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
```

- [ ] **Step 2: Rodar teste para verificar que falha**

```bash
npx vitest run src/tests/payment-status.test.ts
```

Esperado: FAIL.

- [ ] **Step 3: Implementar a rota**

```ts
// src/app/api/payment/status/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const payment = await prisma.payment.findUnique({
    where: { id },
  })

  if (!payment || payment.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Marca como expired se passou o tempo
  if (payment.status === 'pending' && payment.expiresAt < new Date()) {
    await prisma.payment.update({
      where: { id },
      data: { status: 'expired' },
    })
    return NextResponse.json({ status: 'expired' })
  }

  return NextResponse.json({ status: payment.status })
}
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
npx vitest run src/tests/payment-status.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/status/ src/tests/payment-status.test.ts
git commit -m "feat: add GET /api/payment/status/[id] endpoint"
```

---

## Task 10: API `POST /api/webhook/mercadopago`

**Files:**
- Create: `src/app/api/webhook/mercadopago/route.ts`
- Create: `src/tests/webhook.test.ts`

- [ ] **Step 1: Escrever os testes**

```ts
// src/tests/webhook.test.ts
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
```

- [ ] **Step 2: Rodar teste para verificar que falha**

```bash
npx vitest run src/tests/webhook.test.ts
```

Esperado: FAIL.

- [ ] **Step 3: Implementar a rota**

```ts
// src/app/api/webhook/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'
import { activateSubscription } from '@/lib/subscription'

function validateSignature(req: NextRequest, dataId: string): boolean {
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

export async function POST(req: NextRequest) {
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
    await activateSubscription(payment.userId)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
npx vitest run src/tests/webhook.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhook/mercadopago/route.ts src/tests/webhook.test.ts
git commit -m "feat: add POST /api/webhook/mercadopago endpoint"
```

---

## Task 11: Criar `middleware.ts` (proteção do dashboard)

**Files:**
- Create: `middleware.ts` (raiz do projeto, ao lado de `package.json`)

- [ ] **Step 1: Criar o middleware**

```ts
// middleware.ts (na raiz do projeto)
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const status = token.subscriptionStatus as string | undefined
  const expiresAt = token.subscriptionExpiresAt as string | null | undefined

  const isActive =
    status === 'active' &&
    expiresAt != null &&
    new Date(expiresAt) > new Date()

  if (!isActive) {
    return NextResponse.redirect(new URL('/assinar', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd C:/tmp/tarot-mistico
npx tsc --noEmit
```

- [ ] **Step 3: Testar manualmente**

Iniciar o servidor de dev:
```bash
npm run dev
```

Tentar acessar `http://localhost:3000/dashboard` sem estar logado.
Esperado: redirecionado para `/login`.

Logar com um usuário sem subscription ativa.
Esperado: redirecionado para `/assinar`.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware to protect /dashboard with subscription check"
```

---

## Task 12: Criar página `/assinar`

**Files:**
- Create: `src/app/assinar/page.tsx`

> **Nota (spec §/assinar):** A spec menciona "se já existe um pagamento pending, exibe o QR existente sem gerar novo". Essa UX está **diferida** nesta implementação: o backend já expira os pendings anteriores ao criar um novo, então um segundo clique em "Gerar PIX" sempre produz um QR fresco. A restauração do QR entre sessões (via sessionStorage) pode ser adicionada em iteração futura sem impacto na correção do fluxo.

- [ ] **Step 1: Criar a página**

```tsx
// src/app/assinar/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type PaymentState =
  | { step: 'idle' }
  | { step: 'loading' }
  | { step: 'qr'; paymentId: string; qrCode: string; qrCodeBase64: string; expiresAt: string }
  | { step: 'expired' }
  | { step: 'approved' }
  | { step: 'error'; message: string }

export default function AssinarPage() {
  const { update: updateSession } = useSession()
  const router = useRouter()
  const [state, setState] = useState<PaymentState>({ step: 'idle' })
  const [copied, setCopied] = useState(false)

  const gerarPix = async () => {
    setState({ step: 'loading' })
    try {
      const res = await fetch('/api/payment/create', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar PIX')
      setState({
        step: 'qr',
        paymentId: data.payment_id,
        qrCode: data.qr_code,
        qrCodeBase64: data.qr_code_base64,
        expiresAt: data.expires_at,
      })
    } catch (e: unknown) {
      setState({ step: 'error', message: e instanceof Error ? e.message : 'Erro desconhecido' })
    }
  }

  const copiar = async () => {
    if (state.step !== 'qr') return
    await navigator.clipboard.writeText(state.qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pollStatus = useCallback(async (paymentId: string) => {
    const res = await fetch(`/api/payment/status/${paymentId}`)
    const data = await res.json()
    if (data.status === 'approved') {
      setState({ step: 'approved' })
      await updateSession()
      router.push('/dashboard')
    } else if (data.status === 'expired' || data.status === 'rejected') {
      setState({ step: 'expired' })
    }
  }, [updateSession, router])

  useEffect(() => {
    if (state.step !== 'qr') return
    const interval = setInterval(() => pollStatus(state.paymentId), 5000)
    return () => clearInterval(interval)
  }, [state, pollStatus])

  // Countdown
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (state.step !== 'qr') return
    const interval = setInterval(() => {
      const diff = new Date(state.expiresAt).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Expirado'); return }
      const min = Math.floor(diff / 60000)
      const sec = Math.floor((diff % 60000) / 1000)
      setCountdown(`${min}:${sec.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [state])

  return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0D0A1A 0%, #1A0F2E 100%)' }}>
      <div className="bg-[#1A0F2E] border border-[#2D1B5E] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <h1 className="text-3xl font-bold text-[#D4AF37] mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
          TarotMístico
        </h1>
        <p className="text-[#F0E6FF] mb-6">Acesso completo por <strong>R$5/mês</strong></p>

        {state.step === 'idle' && (
          <button
            onClick={gerarPix}
            className="w-full py-3 rounded-xl font-bold text-black"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #7B2FBE)' }}>
            Gerar PIX R$5
          </button>
        )}

        {state.step === 'loading' && (
          <p className="text-[#F0E6FF] animate-pulse">Gerando QR Code...</p>
        )}

        {state.step === 'qr' && (
          <div className="flex flex-col items-center gap-4">
            <Image
              src={`data:image/png;base64,${state.qrCodeBase64}`}
              alt="QR Code PIX"
              width={200} height={200}
              className="rounded-lg border-2 border-[#7B2FBE]"
            />
            <p className="text-sm text-[#F0E6FF]/70">Expira em: <strong className="text-[#D4AF37]">{countdown}</strong></p>
            <button
              onClick={copiar}
              className="w-full py-2 rounded-lg border border-[#7B2FBE] text-[#F0E6FF] text-sm">
              {copied ? '✓ Copiado!' : 'Copiar código PIX'}
            </button>
            <p className="text-xs text-[#F0E6FF]/50">Aguardando confirmação do pagamento...</p>
          </div>
        )}

        {state.step === 'expired' && (
          <div className="flex flex-col gap-4">
            <p className="text-red-400">QR Code expirado ou pagamento cancelado.</p>
            <button onClick={gerarPix}
              className="w-full py-3 rounded-xl font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #7B2FBE)' }}>
              Gerar novo PIX
            </button>
          </div>
        )}

        {state.step === 'approved' && (
          <p className="text-green-400 font-bold">Pagamento confirmado! Redirecionando...</p>
        )}

        {state.step === 'error' && (
          <div className="flex flex-col gap-4">
            <p className="text-red-400">{state.message}</p>
            <button onClick={() => setState({ step: 'idle' })}
              className="text-[#D4AF37] underline text-sm">Tentar novamente</button>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Testar manualmente no browser**

```bash
npm run dev
```

Acessar `http://localhost:3000/assinar` e clicar em "Gerar PIX R$5".
Com `MERCADOPAGO_ACCESS_TOKEN=TEST-xxx` válido: deve exibir QR Code real.
Sem token válido: deve exibir mensagem de erro amigável.

- [ ] **Step 4: Commit**

```bash
git add src/app/assinar/page.tsx
git commit -m "feat: add /assinar page with PIX QR code and polling"
```

---

## Task 13: Rodar todos os testes e validar build

- [ ] **Step 1: Rodar toda a suíte de testes**

```bash
cd C:/tmp/tarot-mistico
npx vitest run
```

Esperado: todos os testes passam.

- [ ] **Step 2: Verificar build de produção**

```bash
npm run build
```

Esperado: build completo sem erros.

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: PIX payment integration complete (MercadoPago + webhook + /assinar)"
```

---

## Notas de Deploy

Ao fazer deploy na Vercel, adicionar as variáveis de ambiente:
- `MERCADOPAGO_ACCESS_TOKEN` — trocar de `TEST-xxx` para o token de produção
- `MERCADOPAGO_WEBHOOK_SECRET` — configurar no painel MP em "Notificações de pagamento"
- `NEXT_PUBLIC_BASE_URL` — URL de produção (ex: `https://tarot-mistico.vercel.app`)

No painel MercadoPago, configurar a URL de webhook para:
`https://tarot-mistico.vercel.app/api/webhook/mercadopago`
