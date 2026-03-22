'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles, Send, LogOut } from 'lucide-react'
import Link from 'next/link'

type TarotCard = {
  id: string
  name: string
  numeral: string
  symbol: string
  keywords: string[]
  uprightMeaning: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Consultation = {
  id: string
  type: string
  status: string
  cards: TarotCard[] | null
  msgCount: number
  maxMsgs: number
  messages: Message[]
}

const TYPE_LABELS: Record<string, string> = {
  familia: 'Família',
  trabalho: 'Trabalho',
  relacionamento: 'Relacionamento',
}

function CardChip({ card }: { card: TarotCard }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border border-arcane bg-abyss text-xs cursor-pointer hover:border-mystic transition-colors"
    >
      <span className="text-gold text-base leading-none">{card.symbol}</span>
      <span className="text-parchment font-display text-[10px] leading-tight">{card.name}</span>
      {expanded && (
        <span className="text-muted text-[9px] leading-tight mt-0.5 max-w-[80px] text-center">
          {card.keywords.slice(0, 2).join(' · ')}
        </span>
      )}
    </button>
  )
}

function MessageBubble({
  message,
  cards,
  isFirst,
}: {
  message: Message
  cards: TarotCard[] | null
  isFirst: boolean
}) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 font-body text-sm leading-relaxed ${
          isUser
            ? 'bg-mystic/30 border border-mystic/40 text-parchment rounded-tr-sm'
            : 'bg-abyss border border-arcane/60 text-parchment rounded-tl-sm'
        }`}
      >
        {!isUser && isFirst && cards && cards.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {cards.map((card) => (
              <CardChip key={card.id} card={card} />
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

export function ConsultationChat({ consultation }: { consultation: Consultation }) {
  const prefersReducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<Message[]>(consultation.messages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [msgCount, setMsgCount] = useState(consultation.msgCount)
  const [closed, setClosed] = useState(consultation.status === 'closed')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const cards = consultation.cards as TarotCard[] | null
  const remaining = consultation.maxMsgs - msgCount

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [messages, streamText, prefersReducedMotion])

  async function sendMessage() {
    if (!input.trim() || streaming || closed || remaining <= 0) return

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamText('')

    try {
      const res = await fetch(`/api/consultation/${consultation.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'assistant', content: `Erro: ${err.error}` },
        ])
        setStreaming(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              setMessages((prev) => [
                ...prev,
                { id: `ai-${Date.now()}`, role: 'assistant', content: accumulated },
              ])
              setStreamText('')
              const newCount = msgCount + 1
              setMsgCount(newCount)
              if (newCount >= consultation.maxMsgs) setClosed(true)
            } else {
              try {
                const { text } = JSON.parse(data)
                accumulated += text
                setStreamText(accumulated)
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'Erro de conexão. Tente novamente.' },
      ])
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-b border-mystic/20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="font-display text-sm text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted text-xs font-body">
              {TYPE_LABELS[consultation.type]} ·{' '}
              <span className="text-parchment">
                {closed ? 'Encerrada' : `${remaining} msg${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}`}
              </span>
            </span>
            <Link
              href="/dashboard"
              className="text-muted hover:text-parchment transition-colors"
              title="Voltar ao dashboard"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Message counter dots */}
      <div className="fixed top-14 left-0 right-0 z-40 flex justify-center py-1 bg-void/80">
        <div className="flex gap-1">
          {Array.from({ length: consultation.maxMsgs }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < msgCount ? 'bg-gold' : 'bg-arcane'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pt-24 pb-28 overflow-y-auto">
        {messages.length === 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <p className="text-gold font-display text-lg mb-2">Madame Seraphina aguarda</p>
            <p className="text-muted font-body text-sm">
              Faça sua pergunta sobre {TYPE_LABELS[consultation.type].toLowerCase()}...
            </p>
          </motion.div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            cards={cards}
            isFirst={idx === 0 && msg.role === 'assistant'}
          />
        ))}

        {streaming && streamText && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-abyss border border-arcane/60 font-body text-sm text-parchment leading-relaxed">
              <p className="whitespace-pre-wrap">{streamText}</p>
              <span className="inline-block w-1 h-4 bg-gold animate-pulse ml-0.5" />
            </div>
          </div>
        )}

        {closed && !streaming && (
          <div className="text-center py-8">
            <p className="text-muted font-body text-sm mb-4">Consulta encerrada</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2 rounded-xl font-body text-sm bg-mystic/20 border border-mystic/40 text-parchment hover:bg-mystic/30 transition-colors"
            >
              Nova consulta
            </Link>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!closed && (
        <div className="fixed bottom-0 left-0 right-0 bg-void/95 border-t border-mystic/20 px-4 py-3">
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Faça sua pergunta a Madame Seraphina..."
              disabled={streaming || remaining <= 0}
              rows={1}
              className="flex-1 resize-none rounded-xl bg-abyss border border-arcane/60 text-parchment font-body text-sm px-4 py-2.5 placeholder-muted/60 focus:outline-none focus:border-mystic/60 disabled:opacity-40 max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || streaming || remaining <= 0}
              className="p-2.5 rounded-xl bg-mystic/80 hover:bg-mystic disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
