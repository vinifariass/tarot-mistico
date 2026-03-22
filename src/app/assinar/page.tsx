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
