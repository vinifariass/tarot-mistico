"use client";

import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Sparkles, Heart, Briefcase, Users, LogOut, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

const DAILY_CARDS = [
  {
    name: "A Estrela", roman: "XVII", symbol: "✦",
    topGradient: "linear-gradient(160deg,#1a1050 0%,#0d0830 60%,#050318 100%)",
    accent: "#A78BFA", ornament: "#DDD6FE",
    meaning: "Esperança, inspiração e renovação espiritual. Um período de cura e clareza se aproxima. Confie na jornada.",
    keywords: ["Esperança", "Renovação", "Cura"],
  },
  {
    name: "O Sol", roman: "XIX", symbol: "☀",
    topGradient: "linear-gradient(160deg,#5c2a00 0%,#3d1a00 60%,#1a0a00 100%)",
    accent: "#FCD34D", ornament: "#FDE68A",
    meaning: "Alegria, sucesso e vitalidade. Seus esforços serão recompensados. Brilhe com autenticidade hoje.",
    keywords: ["Vitória", "Alegria", "Clareza"],
  },
  {
    name: "A Lua", roman: "XVIII", symbol: "☽",
    topGradient: "linear-gradient(160deg,#0c1a4a 0%,#060d2e 60%,#020510 100%)",
    accent: "#93C5FD", ornament: "#BFDBFE",
    meaning: "Intuição, subconsciente e ilusões. Confie nos seus instintos mas cuidado com medos desnecessários.",
    keywords: ["Intuição", "Mistério", "Sonhos"],
  },
];

const CONSULTATIONS = [
  {
    id: "familia",
    icon: Users,
    label: "Família",
    price: 3,
    accent: "#34D399",
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/30",
    iconBg: "bg-emerald-500/10 border-emerald-500/25",
    description: "Dinâmica familiar, vínculos e conflitos",
    tiragem: "3 cartas",
  },
  {
    id: "trabalho",
    icon: Briefcase,
    label: "Trabalho",
    price: 3,
    accent: "#60A5FA",
    border: "border-blue-500/30",
    bg: "bg-blue-950/30",
    iconBg: "bg-blue-500/10 border-blue-500/25",
    description: "Carreira, propósito e oportunidades",
    tiragem: "3 cartas",
  },
  {
    id: "relacionamento",
    icon: Heart,
    label: "Relacionamento",
    price: 5,
    accent: "#F472B6",
    border: "border-pink-500/40",
    bg: "bg-pink-950/30",
    iconBg: "bg-pink-500/10 border-pink-500/25",
    description: "Amor, paixão e conexões da alma",
    tiragem: "Celtic Cross",
  },
];

function OrnamentalDivider({ color }: { color: string }) {
  return (
    <svg width="80" height="10" viewBox="0 0 80 10" fill="none">
      <line x1="0" y1="5" x2="25" y2="5" stroke={color} strokeWidth="0.5" opacity="0.5" />
      <polygon points="32,5 35,2.5 38,5 35,7.5" fill={color} opacity="0.7" />
      <circle cx="40" cy="5" r="1.2" fill={color} />
      <polygon points="48,5 45,2.5 42,5 45,7.5" fill={color} opacity="0.7" />
      <line x1="55" y1="5" x2="80" y2="5" stroke={color} strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

export function DashboardClient({ session }: { session: Session }) {
  const prefersReducedMotion = useReducedMotion();
  const [cardRevealed, setCardRevealed] = useState(false);
  const [currentCard] = useState(
    DAILY_CARDS[Math.floor(Math.random() * DAILY_CARDS.length)]
  );

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-b border-mystic/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="font-display text-lg text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-muted text-sm font-body hidden sm:block">
              Olá,{" "}
              <span className="text-parchment">
                {session.user?.name?.split(" ")[0] || "Viajante"}
              </span>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 text-muted hover:text-parchment transition-colors text-sm font-body cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sair</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-8">

        {/* Boas-vindas */}
        <motion.div initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl sm:text-4xl text-parchment mb-1">
            Seu Portal Místico
          </h1>
          <p className="text-muted font-body text-sm">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* Carta do dia — col 3 */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="bg-abyss border border-mystic/20 rounded-2xl p-6 h-full">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-base text-parchment tracking-wide">
                  Carta do Dia — Gratuita
                </h2>
                <button
                  onClick={() => setCardRevealed(false)}
                  title="Nova carta"
                  className="text-muted hover:text-parchment transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {!cardRevealed ? (
                <div className="flex flex-col items-center gap-5 py-2">
                  <motion.div
                    className="relative cursor-pointer"
                    style={{
                      width: 120,
                      height: 196,
                      borderRadius: 12,
                      background: "linear-gradient(160deg,#2D1B5E,#1A0F2E,#0D0A1A)",
                      border: "1.5px solid rgba(123,47,190,0.5)",
                      boxShadow: "0 0 30px rgba(123,47,190,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                    onClick={() => setCardRevealed(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCardRevealed(true); } }}
                    role="button"
                    tabIndex={0}
                    aria-label="Revelar carta do dia"
                    animate={prefersReducedMotion ? {} : {
                      boxShadow: [
                        "0 0 20px rgba(123,47,190,0.2)",
                        "0 0 60px rgba(212,175,55,0.35)",
                        "0 0 20px rgba(123,47,190,0.2)",
                      ],
                    }}
                    transition={prefersReducedMotion ? {} : { duration: 2.5, repeat: Infinity }}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                  >
                    {/* Verso decorativo */}
                    <div className="absolute inset-[8px] rounded-[7px] border border-gold/15" />
                    <div className="absolute inset-[14px] rounded-[5px] border border-mystic/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        style={{ color: "#D4AF37", filter: "drop-shadow(0 0 12px rgba(212,175,55,0.8))" }}
                        animate={prefersReducedMotion ? {} : { opacity: [0.5, 1, 0.5] }}
                        transition={prefersReducedMotion ? {} : { duration: 2, repeat: Infinity }}
                      >
                        <Sparkles className="w-8 h-8" style={{ color: "#D4AF37" }} />
                      </motion.div>
                    </div>
                  </motion.div>
                  <div className="text-center">
                    <p className="text-parchment font-body text-sm">Toque para revelar</p>
                    <p className="text-muted text-xs font-body mt-1">
                      Concentre-se numa pergunta antes
                    </p>
                  </div>
                </div>
              ) : (
                <motion.div
                  className="flex flex-col sm:flex-row gap-5 items-center sm:items-start"
                  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={prefersReducedMotion ? {} : { type: "spring", stiffness: 200 }}
                >
                  {/* Carta revelada */}
                  <div
                    className="shrink-0 flex flex-col items-center justify-between px-2.5 py-3 rounded-xl"
                    style={{
                      width: 100,
                      height: 164,
                      background: currentCard.topGradient,
                      border: `1.5px solid ${currentCard.accent}50`,
                      boxShadow: `0 0 30px ${currentCard.accent}40`,
                    }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-display text-[9px] tracking-widest" style={{ color: currentCard.ornament }}>
                        {currentCard.roman}
                      </span>
                      <OrnamentalDivider color={currentCard.ornament} />
                    </div>
                    <span
                      className="text-3xl leading-none"
                      style={{
                        color: currentCard.ornament,
                        textShadow: `0 0 20px ${currentCard.accent}`,
                        filter: `drop-shadow(0 0 8px ${currentCard.accent})`,
                      }}
                    >
                      {currentCard.symbol}
                    </span>
                    <div className="flex flex-col items-center gap-0.5">
                      <OrnamentalDivider color={currentCard.ornament} />
                      <span className="font-display text-[8px] tracking-[0.2em] uppercase text-center" style={{ color: "#F0E6FF" }}>
                        {currentCard.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-display text-xl mb-0.5" style={{ color: currentCard.ornament }}>
                      {currentCard.name}
                    </h3>
                    <p className="text-xs font-body tracking-widest uppercase mb-3" style={{ color: currentCard.accent + "99" }}>
                      Arcano Maior · {currentCard.roman}
                    </p>
                    <p className="text-parchment/80 font-body text-sm leading-relaxed mb-4">
                      {currentCard.meaning}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {currentCard.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2.5 py-1 rounded-full text-[10px] font-body"
                          style={{
                            background: currentCard.accent + "18",
                            border: `1px solid ${currentCard.accent}35`,
                            color: currentCard.accent,
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Histórico rápido — col 2 */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-abyss border border-white/5 rounded-2xl p-5 h-full flex flex-col">
              <h2 className="font-display text-base text-parchment tracking-wide mb-4">
                Suas Consultas
              </h2>
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
                <Sparkles className="w-8 h-8 text-gold/50" />
                <p className="text-muted text-xs font-body text-center leading-relaxed">
                  Nenhuma consulta ainda.
                  <br />
                  Escolha uma abaixo para começar.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Consultas disponíveis */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { delay: 0.25 }}
        >
          <h2 className="font-display text-xl text-parchment tracking-wide mb-5">
            Iniciar uma Consulta
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {CONSULTATIONS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.3 + i * 0.08 }}
                  className={`relative rounded-2xl ${item.bg} ${item.border} border p-5 flex flex-col gap-4 cursor-pointer group transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]`}
                  whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.01 }}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl ${item.iconBg} border flex items-center justify-center`}>
                      <Icon className="w-5 h-5" style={{ color: item.accent }} />
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl text-parchment leading-none">
                        R${item.price}
                      </p>
                      <p className="text-muted text-[10px] font-body">por consulta</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-display text-parchment tracking-wide mb-0.5">{item.label}</p>
                    <p className="text-muted text-xs font-body">{item.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className="text-[10px] font-body tracking-wider uppercase px-2.5 py-1 rounded-full"
                      style={{
                        background: item.accent + "15",
                        border: `1px solid ${item.accent}30`,
                        color: item.accent,
                      }}
                    >
                      {item.tiragem}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      style={{ color: item.accent + "80" }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="text-muted text-xs font-body text-center mt-4">
            Após selecionar, você receberá as instruções de pagamento via PIX para liberar a consulta.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
