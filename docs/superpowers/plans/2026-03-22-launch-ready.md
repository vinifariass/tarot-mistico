# Launch-Ready Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare TarotMístico for production launch — PostgreSQL migration, remove subscription gate, fix copy, add legal pages, configure Vercel.

**Architecture:** Minimal changes only — swap SQLite for PostgreSQL, remove two subscription checks (middleware + API), update copy in 3 components, create 3 static pages, fix vercel.json. No new features, no backend refactor.

**Tech Stack:** Next.js 15 App Router, Prisma 6 + PostgreSQL (Supabase), NextAuth v4, MercadoPago SDK, Anthropic SDK, Tailwind CSS, Vercel

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `prisma/schema.prisma` | Modify | provider sqlite → postgresql |
| `prisma/migrations/` | Delete | SQLite migrations incompatible with PostgreSQL |
| `middleware.ts` | Modify | Remove subscriptionStatus check, keep only auth check |
| `src/app/api/consultation/start/route.ts` | Modify | Remove subscription gate (lines 27–40) |
| `vercel.json` | Modify | Add missing env var declarations |
| `src/app/assinar/page.tsx` | Modify | Dynamic copy from sessionStorage, redirect if no consultationId |
| `src/app/dashboard/DashboardClient.tsx` | Modify | Add type + amount to sessionStorage payload |
| `src/components/HowItWorksSection.tsx` | Modify | Update 3 steps → 4 steps matching real product flow |
| `src/components/PricingSection.tsx` | Modify | Remove "PDF da leitura salvo" from features + FAQ |
| `src/app/termos/page.tsx` | Create | Static terms of use page |
| `src/app/privacidade/page.tsx` | Create | Static privacy policy page |
| `src/app/not-found.tsx` | Create | Custom 404 page |
| `docs/mercadopago-producao.md` | Create | MP production setup guide |

---

## Task 1: PostgreSQL Migration (Supabase)

**Files:**
- Modify: `prisma/schema.prisma`
- Delete: `prisma/migrations/`

> **Why not `migrate deploy`:** The existing migrations use SQLite syntax and the `migration_lock.toml` has `provider = "sqlite"`. Prisma rejects running them against PostgreSQL. Use `db push` instead — it syncs the schema directly without migration files.

- [ ] **Step 1: Change Prisma provider to postgresql**

In `prisma/schema.prisma`, replace lines 5–8:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 2: Update DATABASE_URL in .env**

In `.env`, replace the `DATABASE_URL` line:

```
DATABASE_URL="postgresql://postgres.tykqswjmxtnywbpikjno:x34Dc2JPL2vsj6u0@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

- [ ] **Step 3: Delete the SQLite migrations directory**

```bash
cd C:/tmp/tarot-mistico && rm -rf prisma/migrations
```

- [ ] **Step 4: Push schema to Supabase**

```bash
cd C:/tmp/tarot-mistico && npx prisma db push
```

Expected output:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-0-us-west-2.pooler.supabase.com:5432"

Your database is now in sync with your Prisma schema.
```

If you see connection errors: verify the `DATABASE_URL` in `.env` is correct and that the Supabase project is active.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run tests**

```bash
cd C:/tmp/tarot-mistico && npm test
```

Expected: 7 test files, 22 tests pass. (Tests use SQLite via a test env — they may skip DB calls. Any failures here indicate a pre-existing issue, not this change.)

- [ ] **Step 7: Commit**

> **Do NOT stage `.env`** — it contains real credentials. Stage only `prisma/schema.prisma`.

```bash
cd C:/tmp/tarot-mistico && git add prisma/schema.prisma && git commit -m "chore: migrate database provider to postgresql (supabase)"
```

---

## Task 2: Remove Subscription Gates

**Files:**
- Modify: `middleware.ts`
- Modify: `src/app/api/consultation/start/route.ts`

### 2a — Middleware (`middleware.ts` — root level, NOT `src/middleware.ts`)

- [ ] **Step 1: Simplify middleware to auth-only check**

Replace the full content of `middleware.ts` (at the project root, same level as `package.json`):

```typescript
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

### 2b — consultation/start API

- [ ] **Step 2: Remove subscription check from consultation/start**

In `src/app/api/consultation/start/route.ts`, delete lines 27–40 (the entire subscription block):

```typescript
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
```

The line immediately after the deleted block (`const body = await req.json()`) should now follow directly after `const userId = session.user.id`.

Also remove the unused `prisma` import if `prisma` is no longer needed... actually `prisma` IS still used later in the same file (for `payment.updateMany`, `payment.create`, `consultation.create`, `payment.update`). Keep the import.

- [ ] **Step 3: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
cd C:/tmp/tarot-mistico && npm test
```

Expected: 22 tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add middleware.ts src/app/api/consultation/start/route.ts && git commit -m "feat: remove subscription gate from middleware and consultation API"
```

---

## Task 3: Fix vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add all required env var declarations**

Replace full content of `vercel.json`:

```json
{
  "buildCommand": "npx prisma generate && next build",
  "framework": "nextjs",
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url",
    "MERCADOPAGO_ACCESS_TOKEN": "@mercadopago_access_token",
    "MERCADOPAGO_WEBHOOK_SECRET": "@mercadopago_webhook_secret",
    "ANTHROPIC_API_KEY": "@anthropic_api_key",
    "NEXT_PUBLIC_BASE_URL": "@next_public_base_url"
  }
}
```

> The `@name` syntax references secrets stored in Vercel's environment variables dashboard. Each value must be created there manually before deploy.

- [ ] **Step 2: Commit**

```bash
cd C:/tmp/tarot-mistico && git add vercel.json && git commit -m "chore: add all required env vars to vercel.json"
```

---

## Task 4: Assinar Page — Dynamic Copy + Redirect

**Files:**
- Modify: `src/app/dashboard/DashboardClient.tsx`
- Modify: `src/app/assinar/page.tsx`

### 4a — DashboardClient: save type + amount in sessionStorage

- [ ] **Step 1: Add type and amount to sessionStorage payload**

In `src/app/dashboard/DashboardClient.tsx`, find the `handleStartConsultation` function. Locate the existing `sessionStorage.setItem(...)` call. You need to:
1. Add a `const consultationItem` line **before** the `sessionStorage.setItem` call
2. Replace the `sessionStorage.setItem` call to include `type` and `amount`

The two statements should look like this (inserted as a block replacing the existing `sessionStorage.setItem` call):

**Before:**
```typescript
    sessionStorage.setItem(`consultation_qr_${data.consultationId}`, JSON.stringify({
      paymentId: data.payment_id,
      qrCode: data.qr_code,
      qrCodeBase64: data.qr_code_base64,
      expiresAt: data.expires_at,
    }))
```

**After (replace the block above with these two statements):**
```typescript
    const consultationItem = CONSULTATIONS.find((c) => c.id === type)
    sessionStorage.setItem(`consultation_qr_${data.consultationId}`, JSON.stringify({
      paymentId: data.payment_id,
      qrCode: data.qr_code,
      qrCodeBase64: data.qr_code_base64,
      expiresAt: data.expires_at,
      type,
      amount: consultationItem?.price ?? 0,
    }))
```

Note: `const consultationItem` is a separate statement, not part of the JSON object. Do not nest it inside the `JSON.stringify` call.

### 4b — Assinar page: dynamic copy + redirect

- [ ] **Step 2: Replace the full content of `src/app/assinar/page.tsx`**

```typescript
'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

type PaymentState =
  | { step: 'idle' }
  | { step: 'loading' }
  | { step: 'qr'; paymentId: string; qrCode: string; qrCodeBase64: string; expiresAt: string }
  | { step: 'expired' }
  | { step: 'approved' }
  | { step: 'error'; message: string }
  | { step: 'qr_missing' }

const TYPE_LABELS: Record<string, string> = {
  familia: 'Família',
  trabalho: 'Trabalho',
  relacionamento: 'Relacionamento',
}

function AssinarContent() {
  const { update: updateSession } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const consultationId = searchParams.get('consultationId')
  const prefersReducedMotion = useReducedMotion()
  const [state, setState] = useState<PaymentState>({ step: 'idle' })
  const [copied, setCopied] = useState(false)
  const [consultationType, setConsultationType] = useState<string | null>(null)
  const [consultationAmount, setConsultationAmount] = useState<number | null>(null)

  // Redirect to dashboard if accessed directly without consultationId
  useEffect(() => {
    if (!consultationId) {
      router.replace('/dashboard')
    }
  }, [consultationId, router])

  // Load QR from sessionStorage if coming from dashboard consultation start
  useEffect(() => {
    if (!consultationId) return
    const raw = sessionStorage.getItem(`consultation_qr_${consultationId}`)
    if (!raw) {
      setState({ step: 'qr_missing' })
      return
    }
    try {
      const { paymentId, qrCode, qrCodeBase64, expiresAt, type, amount } = JSON.parse(raw)
      setState({ step: 'qr', paymentId, qrCode, qrCodeBase64, expiresAt })
      setConsultationType(type ?? null)
      setConsultationAmount(amount ?? null)
      sessionStorage.removeItem(`consultation_qr_${consultationId}`)
    } catch {
      setState({ step: 'qr_missing' })
    }
  }, [consultationId])

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
      router.push(consultationId ? `/consulta/${consultationId}` : '/dashboard')
    } else if (data.status === 'expired' || data.status === 'rejected') {
      setState({ step: 'expired' })
    }
  }, [updateSession, router, consultationId])

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

  const stars = Array.from({ length: prefersReducedMotion ? 0 : 30 }, (_, i) => ({
    id: i,
    x: `${(i * 17.3) % 100}%`,
    y: `${(i * 23.7) % 100}%`,
    size: (i % 3) + 1,
    delay: (i * 0.15) % 3,
  }))

  const typeLabel = consultationType ? TYPE_LABELS[consultationType] ?? consultationType : null

  // While redirecting (no consultationId), render nothing
  if (!consultationId) return null

  return (
    <main className="min-h-screen bg-void flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/80 backdrop-blur-md border-b border-mystic/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 text-gold group-hover:text-gold-light transition-colors" />
            <span className="font-display text-xl text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
          <Link href="/dashboard" className="text-sm text-muted hover:text-parchment transition-colors font-body">
            Voltar ao dashboard
          </Link>
        </div>
      </nav>

      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-arcane/30 via-void to-void" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-mystic/10 blur-[120px]" />
        {stars.map((s) => (
          <motion.div
            key={s.id}
            className="absolute rounded-full"
            style={{
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              background: s.size > 2 ? '#D4AF37' : '#F0E6FF',
            }}
            animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.6, 1.3, 0.6] }}
            transition={{ duration: 2.5, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pt-24 pb-16">
        <motion.div
          className="bg-abyss border border-arcane/60 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative z-10"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.6, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <h1 className="font-display text-3xl text-gold tracking-widest">
              TarotMístico
            </h1>
          </div>
          <p className="text-parchment font-body mb-1">
            {typeLabel
              ? <>Consulta de <strong className="text-gold">{typeLabel}</strong></>
              : 'Consulta de Tarot'
            }
          </p>
          <p className="text-muted text-xs font-body mb-6">
            {consultationAmount !== null
              ? `R$${consultationAmount} · pagamento único via PIX`
              : 'Pagamento único via PIX'
            }
          </p>

          <div className="w-full h-px bg-arcane/40 mb-6" />

          {state.step === 'idle' && (
            <p className="text-parchment font-body animate-pulse text-sm">Carregando...</p>
          )}

          {state.step === 'loading' && (
            <p className="text-parchment font-body animate-pulse">Gerando QR Code...</p>
          )}

          {state.step === 'qr_missing' && (
            <div className="flex flex-col gap-4">
              <p className="text-muted font-body text-sm">
                O QR Code expirou ou não foi encontrado.
              </p>
              <Link
                href="/dashboard"
                className="w-full py-3 rounded-xl font-body font-semibold text-void bg-gradient-to-r from-gold to-amethyst hover:opacity-90 transition-opacity text-center block"
              >
                Voltar ao dashboard
              </Link>
            </div>
          )}

          {state.step === 'qr' && (
            <div className="flex flex-col items-center gap-4">
              <Image
                src={`data:image/png;base64,${state.qrCodeBase64}`}
                alt="QR Code PIX"
                width={200} height={200}
                className="rounded-lg border-2 border-mystic/60"
              />
              <p className="text-sm text-parchment/70 font-body">
                Expira em: <strong className="text-gold">{countdown}</strong>
              </p>
              <button
                onClick={copiar}
                className="w-full py-2 rounded-lg border border-arcane text-parchment text-sm font-body hover:border-mystic transition-colors cursor-pointer"
              >
                {copied ? '✓ Copiado!' : 'Copiar código PIX'}
              </button>
              <p className="text-xs text-muted font-body">Aguardando confirmação do pagamento...</p>
            </div>
          )}

          {state.step === 'expired' && (
            <div className="flex flex-col gap-4">
              <p className="text-red-400 font-body text-sm">QR Code expirado ou pagamento cancelado.</p>
              <Link
                href="/dashboard"
                className="w-full py-3 rounded-xl font-body font-semibold text-void bg-gradient-to-r from-gold to-amethyst hover:opacity-90 transition-opacity text-center block"
              >
                Voltar ao dashboard
              </Link>
            </div>
          )}

          {state.step === 'approved' && (
            <p className="text-emerald-400 font-body font-semibold">
              Pagamento confirmado! Redirecionando...
            </p>
          )}

          {state.step === 'error' && (
            <div className="flex flex-col gap-4">
              <p className="text-red-400 font-body text-sm">
                {'message' in state ? state.message : 'Erro desconhecido'}
              </p>
              <Link
                href="/dashboard"
                className="text-gold underline text-sm font-body cursor-pointer"
              >
                Voltar ao dashboard
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}

export default function AssinarPage() {
  return (
    <Suspense>
      <AssinarContent />
    </Suspense>
  )
}
```

- [ ] **Step 3: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
cd C:/tmp/tarot-mistico && npm test
```

Expected: 22 tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/assinar/page.tsx src/app/dashboard/DashboardClient.tsx && git commit -m "feat: assinar page shows consultation type/price, redirects if no consultationId"
```

---

## Task 5: Landing Page Copy Fixes

**Files:**
- Modify: `src/components/HowItWorksSection.tsx`
- Modify: `src/components/PricingSection.tsx`

### 5a — HowItWorksSection: 4-step flow

- [ ] **Step 1: Replace content of `src/components/HowItWorksSection.tsx`**

```typescript
"use client";

import { motion } from "framer-motion";
import { UserPlus, LayoutGrid, QrCode, MessageCircle } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    number: "01",
    title: "Crie sua Conta",
    description: "Cadastro gratuito em menos de 1 minuto. Apenas nome, email e senha.",
    color: "text-amethyst",
    border: "border-amethyst/30",
    bg: "bg-amethyst/10",
  },
  {
    icon: LayoutGrid,
    number: "02",
    title: "Escolha o Tema",
    description: "Família, trabalho ou relacionamento. Cada consulta é focada na área da sua vida que mais precisa de clareza.",
    color: "text-gold",
    border: "border-gold/30",
    bg: "bg-gold/10",
  },
  {
    icon: QrCode,
    number: "03",
    title: "Pague via PIX",
    description: "Escaneie o QR Code e pague de R$3 a R$5. Acesso liberado em minutos após a confirmação.",
    color: "text-mystic",
    border: "border-mystic/30",
    bg: "bg-mystic/10",
  },
  {
    icon: MessageCircle,
    number: "04",
    title: "Converse com Seraphina",
    description: "Madame Seraphina revela suas cartas e responde até 5 perguntas sobre seu tema escolhido.",
    color: "text-parchment",
    border: "border-parchment/20",
    bg: "bg-parchment/5",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-24 bg-abyss relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-gold text-xs font-body tracking-[0.4em] uppercase mb-3 block">O Ritual</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-parchment mb-4">
            Como Funciona
          </h2>
          <p className="text-muted font-body text-base max-w-lg mx-auto">
            Quatro passos simples para acessar a sabedoria das cartas
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative"
            >
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-mystic/40 to-transparent z-0" />
              )}

              <div className={`relative z-10 p-6 rounded-2xl bg-void border ${step.border} flex flex-col gap-4`}>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center`}>
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <span className={`font-display text-3xl font-bold ${step.color} opacity-30`}>{step.number}</span>
                </div>
                <h3 className="font-display text-parchment text-lg tracking-wide">{step.title}</h3>
                <p className="text-muted font-body text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 5b — PricingSection: remove PDF references

- [ ] **Step 2: Remove "PDF da leitura salvo" from all three consultation feature arrays**

In `src/components/PricingSection.tsx`, in the `CONSULTATIONS` array, each item has a `features` array containing `"PDF da leitura salvo"`. Remove that entry from each:

Família features — remove `"PDF da leitura salvo"`:
```typescript
features: [
  "Tiragem de 3 cartas",
  "Foco em dinâmica familiar",
  "Interpretação de conflitos",
  "Orientação sobre relacionamentos",
],
```

Trabalho features — remove `"PDF da leitura salvo"`:
```typescript
features: [
  "Tiragem de 3 cartas",
  "Carreira e propósito",
  "Desafios e oportunidades",
  "Timing de decisões",
],
```

Relacionamento features — remove `"PDF da leitura salvo"`:
```typescript
features: [
  "Celtic Cross (10 cartas)",
  "Passado, presente e futuro",
  "Compatibilidade energética",
  "Obstáculos e potenciais",
  "Orientação espiritual profunda",
],
```

- [ ] **Step 3: Fix the FAQ answer about saved consultations**

In the FAQ array (around line 251), find:
```typescript
{ q: "As leituras ficam salvas?", a: "Sim, todas as suas consultas ficam salvas no seu perfil em PDF para reler quando quiser." },
```

Replace with:
```typescript
{ q: "As leituras ficam salvas?", a: "Sim, todas as suas consultas e o histórico de mensagens ficam salvos no seu perfil." },
```

- [ ] **Step 4: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/components/HowItWorksSection.tsx src/components/PricingSection.tsx && git commit -m "feat: update landing page copy for per-consultation model"
```

---

## Task 6: Legal Pages (/termos + /privacidade)

**Files:**
- Create: `src/app/termos/page.tsx`
- Create: `src/app/privacidade/page.tsx`

- [ ] **Step 1: Create `src/app/termos/page.tsx`**

```typescript
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-void">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-b border-mystic/20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="font-display text-lg text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <h1 className="font-display text-3xl text-parchment mb-2">Termos de Uso</h1>
        <p className="text-muted text-xs font-body mb-10">Última atualização: março de 2026</p>

        <div className="space-y-8 font-body text-parchment/80 text-sm leading-relaxed">

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">1. Sobre o Serviço</h2>
            <p>
              O TarotMístico é uma plataforma de entretenimento e reflexão espiritual que oferece
              consultas de tarot mediadas por inteligência artificial. As consultas são realizadas
              por Madame Seraphina, uma personagem fictícia baseada em IA.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">2. Natureza do Serviço</h2>
            <p>
              As consultas de tarot oferecidas pelo TarotMístico têm <strong className="text-parchment">caráter
              exclusivamente de entretenimento e reflexão pessoal</strong>. Elas não constituem, em hipótese
              alguma, aconselhamento profissional médico, psicológico, jurídico, financeiro ou de
              qualquer outra natureza técnica ou regulamentada.
            </p>
            <p className="mt-3">
              Não tome decisões importantes de vida baseado exclusivamente nas consultas realizadas
              nesta plataforma. Consulte profissionais habilitados para questões de saúde, finanças
              ou assuntos jurídicos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">3. Pagamentos</h2>
            <p>
              Cada consulta é paga individualmente via PIX, nos valores de R$3 (Família ou Trabalho)
              ou R$5 (Relacionamento). O acesso à consulta é liberado após a confirmação do pagamento
              pelo MercadoPago.
            </p>
            <p className="mt-3">
              <strong className="text-parchment">Os pagamentos não são reembolsáveis</strong> após a
              ativação da consulta. Caso o pagamento não seja confirmado dentro do prazo de expiração
              do QR Code (30 minutos), a consulta é cancelada automaticamente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">4. Conta do Usuário</h2>
            <p>
              Você é responsável pela segurança da sua conta e senha. Não compartilhe suas
              credenciais com terceiros. O TarotMístico não se responsabiliza por acessos
              não autorizados decorrentes da negligência do usuário.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">5. Limitação de Responsabilidade</h2>
            <p>
              O TarotMístico fornece o serviço "como está", sem garantias de continuidade,
              disponibilidade ininterrupta ou resultados específicos. Não nos responsabilizamos
              por decisões tomadas com base nas consultas realizadas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">6. Contato</h2>
            <p>
              Dúvidas sobre estes termos? Entre em contato pelo email informado na página principal.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10">
          <Link href="/" className="text-muted text-xs font-body hover:text-parchment transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/privacidade/page.tsx`**

```typescript
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-void">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-b border-mystic/20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="font-display text-lg text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <h1 className="font-display text-3xl text-parchment mb-2">Política de Privacidade</h1>
        <p className="text-muted text-xs font-body mb-10">Última atualização: março de 2026</p>

        <div className="space-y-8 font-body text-parchment/80 text-sm leading-relaxed">

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">1. Dados que Coletamos</h2>
            <ul className="space-y-2 list-disc list-inside text-parchment/70">
              <li><strong className="text-parchment">Nome e email</strong> — fornecidos no cadastro</li>
              <li><strong className="text-parchment">Histórico de consultas</strong> — tipo, data, cartas sorteadas e mensagens trocadas com Madame Seraphina</li>
              <li><strong className="text-parchment">Dados de sessão</strong> — cookies de autenticação gerenciados pelo NextAuth</li>
            </ul>
            <p className="mt-3">
              Dados de pagamento (número de cartão, dados bancários) <strong className="text-parchment">não são
              armazenados por nós</strong>. Os pagamentos são processados diretamente pelo MercadoPago,
              sujeitos à política de privacidade deles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">2. Como Usamos os Dados</h2>
            <ul className="space-y-2 list-disc list-inside text-parchment/70">
              <li>Para autenticar sua conta e manter sua sessão ativa</li>
              <li>Para exibir seu histórico de consultas no dashboard</li>
              <li>Para processar e confirmar pagamentos via MercadoPago</li>
              <li>Para fornecer contexto às consultas de tarot (as cartas sorteadas são enviadas à IA)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">3. Compartilhamento de Dados</h2>
            <p>
              <strong className="text-parchment">Não vendemos nem compartilhamos seus dados pessoais com terceiros</strong>,
              exceto nos casos estritamente necessários para a operação do serviço:
            </p>
            <ul className="space-y-2 list-disc list-inside text-parchment/70 mt-3">
              <li><strong className="text-parchment">MercadoPago</strong> — para processar pagamentos PIX</li>
              <li><strong className="text-parchment">Anthropic</strong> — o conteúdo das mensagens de consulta é enviado à API da Anthropic para gerar respostas da IA (sujeito à política deles)</li>
              <li><strong className="text-parchment">Supabase</strong> — armazenamento seguro do banco de dados</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">4. Cookies</h2>
            <p>
              Utilizamos apenas cookies de sessão gerados pelo NextAuth para manter você autenticado.
              Não utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">5. Seus Direitos</h2>
            <p>
              Você pode solicitar a exclusão da sua conta e de todos os seus dados a qualquer momento.
              Para isso, entre em contato pelo email informado na página principal. Processamos
              solicitações de exclusão em até 7 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">6. Segurança</h2>
            <p>
              Suas senhas são armazenadas com hash (bcrypt). A comunicação com o servidor é
              criptografada via HTTPS. O banco de dados está hospedado na Supabase com
              autenticação por token.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10">
          <Link href="/" className="text-muted text-xs font-body hover:text-parchment transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/termos/ src/app/privacidade/ && git commit -m "feat: add /termos and /privacidade static pages"
```

---

## Task 7: Custom 404 Page

**Files:**
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: Create `src/app/not-found.tsx`**

```typescript
import Link from 'next/link'
import { Sparkles, Star } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 text-center">
      {/* Stars decoration */}
      <div className="flex gap-3 mb-6 opacity-40">
        <Star className="w-3 h-3 text-gold fill-gold" />
        <Star className="w-5 h-5 text-gold fill-gold" />
        <Star className="w-3 h-3 text-gold fill-gold" />
      </div>

      <div className="font-display text-8xl text-arcane/60 mb-2 leading-none">404</div>

      <Sparkles className="w-8 h-8 text-gold/50 my-4" />

      <h1 className="font-display text-2xl text-parchment mb-3">
        Os astros não encontraram essa página
      </h1>
      <p className="text-muted font-body text-sm max-w-sm leading-relaxed mb-8">
        O caminho que você buscou se perdeu nas brumas do cosmos.
        Talvez as cartas o guiem de volta.
      </p>

      <Link
        href="/"
        className="px-6 py-3 rounded-xl font-body text-sm bg-mystic/20 border border-mystic/40 text-parchment hover:bg-mystic/30 transition-colors"
      >
        Voltar ao início
      </Link>

      {/* Bottom stars */}
      <div className="flex gap-3 mt-8 opacity-20">
        <Star className="w-2 h-2 text-parchment fill-parchment" />
        <Star className="w-2 h-2 text-parchment fill-parchment" />
        <Star className="w-2 h-2 text-parchment fill-parchment" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/not-found.tsx && git commit -m "feat: custom 404 page"
```

---

## Task 8: MercadoPago Production Guide + Final Build

**Files:**
- Create: `docs/mercadopago-producao.md`

- [ ] **Step 1: Create `docs/mercadopago-producao.md`**

```markdown
# Configurar MercadoPago para Produção

## 1. Obter as Credenciais de Produção

1. Acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Vá em **Suas integrações** → selecione sua aplicação
3. Clique em **Credenciais de produção**
4. Copie o **Access Token** (começa com `APP_USR-...`)

## 2. Configurar o Webhook no Painel do MP

1. No painel do MP, vá em **Suas integrações** → sua aplicação → **Webhooks**
2. Clique em **Adicionar URL de webhook**
3. URL: `https://[seu-dominio].vercel.app/api/webhook/mercadopago`
4. Eventos: marque **Pagamentos** (`payment`)
5. Salve e copie o **Secret do webhook** (será usado como `MERCADOPAGO_WEBHOOK_SECRET`)

## 3. Configurar Variáveis na Vercel

Acesse o painel da Vercel → seu projeto → **Settings** → **Environment Variables**. Adicione:

| Nome | Valor | Environments |
|------|-------|--------------|
| `DATABASE_URL` | `postgresql://postgres.tykqswjmxtnywbpikjno:[PASS]@aws-0-us-west-2.pooler.supabase.com:5432/postgres` | Production, Preview |
| `NEXTAUTH_URL` | `https://[seu-dominio].vercel.app` | Production |
| `NEXTAUTH_SECRET` | resultado de `openssl rand -base64 32` | Production, Preview |
| `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-...` (token de produção) | Production |
| `MERCADOPAGO_WEBHOOK_SECRET` | secret copiado do painel do MP | Production |
| `ANTHROPIC_API_KEY` | sua API key da Anthropic | Production |
| `NEXT_PUBLIC_BASE_URL` | `https://[seu-dominio].vercel.app` | Production |

> ⚠️ `NEXT_PUBLIC_BASE_URL` precisa ser a URL exata sem barra no final.
> É usada para montar a URL de callback do webhook do MP.
> Se estiver errada, os pagamentos nunca serão confirmados.

## 4. Testar Antes de Anunciar

1. Faça deploy na Vercel
2. Crie uma conta de teste no site
3. Inicie uma consulta no dashboard
4. Pague o PIX real (R$3)
5. Aguarde a confirmação (até 5 minutos)
6. Verifique se a consulta abre no `/consulta/[id]`

Se a consulta não abrir após o pagamento, o problema está no webhook:
- Verifique se a URL do webhook no painel do MP está correta
- Verifique se `MERCADOPAGO_WEBHOOK_SECRET` está correto na Vercel
- Verifique os logs da função em Vercel → Functions → `/api/webhook/mercadopago`
```

- [ ] **Step 2: Run full test suite**

```bash
cd C:/tmp/tarot-mistico && npm test
```

Expected: 7 test files, 22 tests pass.

- [ ] **Step 3: Run production build**

```bash
cd C:/tmp/tarot-mistico && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Final commit**

```bash
cd C:/tmp/tarot-mistico && git add docs/mercadopago-producao.md && git commit -m "docs: mercadopago production setup guide"
```

---

## Deploy Checklist

Antes de apontar o domínio:

- [ ] Todas as 7 variáveis de ambiente configuradas na Vercel
- [ ] Webhook URL registrado no painel do MP
- [ ] `NEXT_PUBLIC_BASE_URL` igual à URL de produção (sem barra final)
- [ ] Testar um pagamento real pós-deploy
- [ ] Verificar `/termos` e `/privacidade` abrindo corretamente
- [ ] Verificar que `/assinar` sem `?consultationId` redireciona para `/dashboard`
