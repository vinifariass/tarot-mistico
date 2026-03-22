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

function AssinarContent() {
  const { update: updateSession } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const consultationId = searchParams.get('consultationId')
  const prefersReducedMotion = useReducedMotion()
  const [state, setState] = useState<PaymentState>({ step: 'idle' })
  const [copied, setCopied] = useState(false)

  // Load QR from sessionStorage if coming from dashboard consultation start
  useEffect(() => {
    if (!consultationId) return
    const raw = sessionStorage.getItem(`consultation_qr_${consultationId}`)
    if (!raw) return
    try {
      const { paymentId, qrCode, qrCodeBase64, expiresAt } = JSON.parse(raw)
      setState({ step: 'qr', paymentId, qrCode, qrCodeBase64, expiresAt })
      sessionStorage.removeItem(`consultation_qr_${consultationId}`)
    } catch {}
  }, [consultationId])

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

  // Simple star particles for background
  const stars = Array.from({ length: prefersReducedMotion ? 0 : 30 }, (_, i) => ({
    id: i,
    x: `${(i * 17.3) % 100}%`,
    y: `${(i * 23.7) % 100}%`,
    size: (i % 3) + 1,
    delay: (i * 0.15) % 3,
  }))

  return (
    <main className="min-h-screen bg-void flex flex-col">
      {/* Atmospheric header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/80 backdrop-blur-md border-b border-mystic/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 text-gold group-hover:text-gold-light transition-colors" />
            <span className="font-display text-xl text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
          <Link href="/login" className="text-sm text-muted hover:text-parchment transition-colors font-body">
            Já tenho conta
          </Link>
        </div>
      </nav>

      {/* Background particles */}
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
            transition={{
              duration: 2.5,
              delay: s.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pt-24 pb-16">
        <motion.div
          className="bg-abyss border border-arcane/60 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative z-10"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.6, ease: 'easeOut' }}
        >
          {/* Logo / title */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <h1 className="font-display text-3xl text-gold tracking-widest">
              TarotMístico
            </h1>
          </div>
          <p className="text-parchment font-body mb-1">
            Assinatura mensal — <strong className="text-gold">R$5/mês</strong>
          </p>
          <p className="text-muted text-xs font-body mb-6">
            Acesso completo ao portal + carta diária gratuita
          </p>

          <div className="w-full h-px bg-arcane/40 mb-6" />

          {state.step === 'idle' && (
            <button
              onClick={gerarPix}
              className="w-full py-3 rounded-xl font-body font-semibold text-void bg-gradient-to-r from-gold to-amethyst hover:opacity-90 transition-opacity cursor-pointer"
            >
              Assinar por R$5 via PIX
            </button>
          )}

          {state.step === 'loading' && (
            <p className="text-parchment font-body animate-pulse">Gerando QR Code...</p>
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
              <button
                onClick={gerarPix}
                className="w-full py-3 rounded-xl font-body font-semibold text-void bg-gradient-to-r from-gold to-amethyst hover:opacity-90 transition-opacity cursor-pointer"
              >
                Gerar novo PIX
              </button>
            </div>
          )}

          {state.step === 'approved' && (
            <p className="text-emerald-400 font-body font-semibold">
              Pagamento confirmado! Redirecionando...
            </p>
          )}

          {state.step === 'error' && (
            <div className="flex flex-col gap-4">
              <p className="text-red-400 font-body text-sm">{state.message}</p>
              <button
                onClick={() => setState({ step: 'idle' })}
                className="text-gold underline text-sm font-body cursor-pointer"
              >
                Tentar novamente
              </button>
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
