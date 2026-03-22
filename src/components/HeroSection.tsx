"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Star, Moon, Sparkles } from "lucide-react";

const TAROT_CARDS = [
  {
    name: "O Mago",
    roman: "I",
    symbol: "☿",
    accent: "#9B59D0",
    glow: "rgba(155,89,208,0.8)",
    topGradient: "linear-gradient(160deg, #3b0d6e 0%, #1a0a3a 50%, #0d0620 100%)",
    borderColor: "#7B2FBE",
    ornamentColor: "#C084FC",
    keywords: ["Poder", "Vontade", "Criação"],
    description: "O início de tudo",
  },
  {
    name: "A Lua",
    roman: "XVIII",
    symbol: "☽",
    accent: "#60A5FA",
    glow: "rgba(96,165,250,0.7)",
    topGradient: "linear-gradient(160deg, #0c1a4a 0%, #060d2e 50%, #020510 100%)",
    borderColor: "#3B82F6",
    ornamentColor: "#93C5FD",
    keywords: ["Mistério", "Intuição", "Ilusão"],
    description: "O inconsciente fala",
  },
  {
    name: "O Sol",
    roman: "XIX",
    symbol: "☀",
    accent: "#F59E0B",
    glow: "rgba(245,158,11,0.85)",
    topGradient: "linear-gradient(160deg, #5c2a00 0%, #3d1a00 50%, #1a0a00 100%)",
    borderColor: "#D97706",
    ornamentColor: "#FCD34D",
    keywords: ["Vitória", "Alegria", "Clareza"],
    description: "A luz do destino",
  },
  {
    name: "A Estrela",
    roman: "XVII",
    symbol: "✦",
    accent: "#E0D7FF",
    glow: "rgba(224,215,255,0.7)",
    topGradient: "linear-gradient(160deg, #1a1050 0%, #0d0830 50%, #050318 100%)",
    borderColor: "#A78BFA",
    ornamentColor: "#DDD6FE",
    keywords: ["Esperança", "Cura", "Renovação"],
    description: "Guia do universo",
  },
  {
    name: "O Mundo",
    roman: "XXI",
    symbol: "◎",
    accent: "#34D399",
    glow: "rgba(52,211,153,0.7)",
    topGradient: "linear-gradient(160deg, #042a1f 0%, #021810 50%, #000d08 100%)",
    borderColor: "#059669",
    ornamentColor: "#6EE7B7",
    keywords: ["Conclusão", "Totalidade", "Êxtase"],
    description: "O ciclo completo",
  },
];

// Ornamento de canto SVG
function CornerOrnament({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 17 L1 1 L17 1" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="1" cy="1" r="1.5" fill={color} />
      <path d="M4 14 L4 4 L14 4" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// Divisor ornamental
function OrnamentalDivider({ color }: { color: string }) {
  return (
    <svg width="100" height="10" viewBox="0 0 100 10" fill="none">
      <line x1="0" y1="5" x2="35" y2="5" stroke={color} strokeWidth="0.5" opacity="0.6" />
      <polygon points="43,5 47,2 50,5 47,8" fill={color} opacity="0.8" />
      <circle cx="50" cy="5" r="1.5" fill={color} />
      <polygon points="57,5 53,2 50,5 53,8" fill={color} opacity="0.8" />
      <line x1="65" y1="5" x2="100" y2="5" stroke={color} strokeWidth="0.5" opacity="0.6" />
    </svg>
  );
}

// Padrão de fundo da carta
function CardPattern({ color }: { color: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none rounded-xl"
      viewBox="0 0 140 230"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={`grid-${color}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="0.5" fill={color} />
          <line x1="0" y1="7" x2="14" y2="7" stroke={color} strokeWidth="0.3" />
          <line x1="7" y1="0" x2="7" y2="14" stroke={color} strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="140" height="230" fill={`url(#grid-${color})`} />
      <circle cx="70" cy="115" r="55" stroke={color} strokeWidth="0.5" fill="none" />
      <circle cx="70" cy="115" r="40" stroke={color} strokeWidth="0.3" fill="none" />
    </svg>
  );
}

function RealisticTarotCard({
  card,
  isActive,
  offset,
}: {
  card: typeof TAROT_CARDS[0];
  isActive: boolean;
  offset: number;
}) {
  return (
    <div
      className="relative select-none"
      style={{
        width: 140,
        height: 230,
        borderRadius: 14,
        background: card.topGradient,
        border: `1.5px solid ${isActive ? card.borderColor : card.borderColor + "60"}`,
        boxShadow: isActive
          ? `0 0 0 1px ${card.borderColor}40,
             0 4px 6px rgba(0,0,0,0.8),
             0 10px 40px rgba(0,0,0,0.8),
             0 0 60px ${card.glow},
             0 0 120px ${card.glow.replace("0.8", "0.4").replace("0.7", "0.35").replace("0.85", "0.4")},
             inset 0 1px 0 rgba(255,255,255,0.08),
             inset 0 -1px 0 rgba(0,0,0,0.4)`
          : `0 4px 20px rgba(0,0,0,0.7),
             inset 0 1px 0 rgba(255,255,255,0.04)`,
        // Pseudo-3D via perspective transform aplicado externamente
      }}
    >
      {/* Gradiente de iluminação (simula luz vindo de cima-esquerda) */}
      <div
        className="absolute inset-0 rounded-[13px] pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
        }}
      />

      {/* Padrão de fundo */}
      <CardPattern color={card.ornamentColor} />

      {/* Shimmer animado na carta ativa */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-[13px] pointer-events-none overflow-hidden"
          initial={false}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, transparent 30%, ${card.accent}22 50%, transparent 70%)`,
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
          />
        </motion.div>
      )}

      {/* Borda interna */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 7,
          borderRadius: 8,
          border: `0.8px solid ${card.ornamentColor}30`,
        }}
      />

      {/* Ornamentos de canto */}
      <div className="absolute top-2 left-2">
        <CornerOrnament color={card.ornamentColor} />
      </div>
      <div className="absolute top-2 right-2 rotate-90">
        <CornerOrnament color={card.ornamentColor} />
      </div>
      <div className="absolute bottom-2 left-2 -rotate-90">
        <CornerOrnament color={card.ornamentColor} />
      </div>
      <div className="absolute bottom-2 right-2 rotate-180">
        <CornerOrnament color={card.ornamentColor} />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between px-3 py-3">
        {/* Topo */}
        <div className="flex flex-col items-center gap-1 w-full">
          <span
            className="font-display text-[11px] tracking-[0.3em]"
            style={{ color: card.ornamentColor }}
          >
            {card.roman}
          </span>
          <OrnamentalDivider color={card.ornamentColor} />
        </div>

        {/* Símbolo central */}
        <div className="flex flex-col items-center gap-3">
          {/* Círculo decorativo ao redor do símbolo */}
          <div className="relative flex items-center justify-center">
            <div
              className="absolute rounded-full"
              style={{
                width: 72,
                height: 72,
                border: `1px solid ${card.accent}40`,
                boxShadow: isActive ? `0 0 20px ${card.glow}, inset 0 0 20px ${card.glow.replace("0.8","0.15").replace("0.7","0.12").replace("0.85","0.15")}` : "none",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: 56,
                height: 56,
                border: `0.5px solid ${card.accent}25`,
              }}
            />
            <span
              className="relative z-10 font-body leading-none"
              style={{
                fontSize: 34,
                color: isActive ? card.ornamentColor : card.ornamentColor + "cc",
                textShadow: isActive
                  ? `0 0 20px ${card.glow}, 0 0 40px ${card.glow}`
                  : "none",
                filter: isActive ? "drop-shadow(0 0 8px " + card.accent + ")" : "none",
              }}
            >
              {card.symbol}
            </span>
          </div>

          {/* Keywords */}
          <div className="flex flex-col items-center gap-0.5">
            {card.keywords.slice(0, 2).map((kw) => (
              <span
                key={kw}
                className="font-body text-[8px] tracking-widest uppercase"
                style={{ color: card.accent + "99" }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Base */}
        <div className="flex flex-col items-center gap-1 w-full">
          <OrnamentalDivider color={card.ornamentColor} />
          <span
            className="font-display text-[10px] tracking-[0.25em] uppercase text-center leading-tight"
            style={{ color: "#F0E6FF" + (isActive ? "" : "bb") }}
          >
            {card.name}
          </span>
        </div>
      </div>
    </div>
  );
}

// Partícula de estrela
function StarParticle({
  delay, x, y, size,
}: {
  delay: number; x: string; y: string; size: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: size > 2 ? "#D4AF37" : "#F0E6FF",
      }}
      animate={{ opacity: [0.1, 1, 0.1], scale: [0.6, 1.4, 0.6] }}
      transition={{
        duration: 2.5 + Math.random() * 2,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function HeroSection() {
  const [activeCard, setActiveCard] = useState(2);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % TAROT_CARDS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: `${(i * 17.3) % 100}%`,
        y: `${(i * 23.7) % 100}%`,
        size: (i % 3) + 1,
        delay: (i * 0.11) % 3,
      })),
    []
  );

  const activeCardData = TAROT_CARDS[activeCard];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-void pt-16">
      {/* ── Fundo ────────────────────────────────────── */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-arcane/40 via-void to-void" />
        {/* Glow central que muda de cor com a carta ativa */}
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[160px]"
          animate={{ backgroundColor: activeCardData.glow.replace("0.8","0.08").replace("0.7","0.07").replace("0.85","0.09") }}
          transition={{ duration: 1.2 }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-mystic/12 blur-[100px]" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-void to-transparent" />
      </div>

      {/* Nebulosa decorativa */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20"
          animate={{
            background: [
              "radial-gradient(circle, rgba(123,47,190,0.4), transparent)",
              "radial-gradient(circle, rgba(212,175,55,0.3), transparent)",
              "radial-gradient(circle, rgba(123,47,190,0.4), transparent)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Estrelas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((s) => (
          <StarParticle key={s.id} delay={s.delay} x={s.x} y={s.y} size={s.size} />
        ))}
      </div>

      {/* ── Conteúdo ─────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 py-12">

        {/* Texto */}
        <motion.div
          className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className="flex items-center gap-2 bg-mystic/20 border border-mystic/40 rounded-full px-4 py-1.5 mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-gold text-xs font-body tracking-widest uppercase">
              Consultas a partir de R$3
            </span>
          </motion.div>

          <h1 className="font-display text-4xl sm:text-5xl xl:text-7xl text-parchment leading-tight mb-6">
            As Cartas
            <br />
            <motion.span
              className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-amethyst inline-block"
              animate={{
                backgroundImage: [
                  "linear-gradient(90deg, #D4AF37, #F0C850, #9B59D0)",
                  "linear-gradient(90deg, #9B59D0, #D4AF37, #F0C850)",
                  "linear-gradient(90deg, #D4AF37, #F0C850, #9B59D0)",
                ],
              }}
              transition={{ duration: 6, repeat: Infinity }}
            >
              Revelam
            </motion.span>
            <br />
            Seu Destino
          </h1>

          <p className="font-body text-muted text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
            Consultas de tarot para{" "}
            <span className="text-parchment/80">família</span>,{" "}
            <span className="text-parchment/80">trabalho</span> e{" "}
            <span className="text-parchment/80">relacionamentos</span>.
            As estrelas falam — você precisa ouvir.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/login?mode=register"
              className="relative overflow-hidden px-8 py-4 bg-gradient-to-r from-mystic to-amethyst text-parchment font-body font-semibold rounded-xl text-base transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_rgba(123,47,190,0.7),0_0_100px_rgba(123,47,190,0.3)] text-center cursor-pointer group"
            >
              <span className="relative z-10">Consultar as Cartas</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
              />
            </Link>
            <Link
              href="#como-funciona"
              className="px-8 py-4 bg-transparent border border-muted/30 hover:border-gold/60 text-muted hover:text-gold font-body rounded-xl text-base transition-all duration-300 text-center cursor-pointer"
            >
              Como Funciona
            </Link>
          </div>

          {/* Social proof */}
          <motion.div
            className="flex items-center gap-3 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex -space-x-2">
              {["R", "M", "L", "A"].map((initial, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-void flex items-center justify-center text-xs text-parchment font-bold"
                  style={{ background: `linear-gradient(135deg, #7B2FBE, #2D1B5E)` }}
                >
                  {initial}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3 h-3 fill-gold text-gold" />
              ))}
              <span className="text-muted text-xs ml-1 font-body">
                +1.200 consultas realizadas
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Cartas 3D ─────────────────────────────── */}
        <motion.div
          className="flex-1 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        >
          <div
            className="relative"
            style={{
              width: 380,
              height: 310,
              perspective: "1200px",
            }}
          >
            {/* Glow no chão */}
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full blur-2xl"
              style={{ width: 200, height: 30 }}
              animate={{
                backgroundColor: activeCardData.glow.replace("0.8","0.35").replace("0.7","0.3").replace("0.85","0.4"),
              }}
              transition={{ duration: 1 }}
            />

            {/* Anéis orbitando */}
            <motion.div
              className="absolute top-1/2 left-1/2 pointer-events-none"
              style={{
                width: 280,
                height: 280,
                marginLeft: -140,
                marginTop: -140,
                borderRadius: "50%",
                border: "1px solid rgba(212,175,55,0.15)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 pointer-events-none"
              style={{
                width: 220,
                height: 220,
                marginLeft: -110,
                marginTop: -110,
                borderRadius: "50%",
                border: "1px solid rgba(123,47,190,0.2)",
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />

            {/* Cartas */}
            {TAROT_CARDS.map((card, i) => {
              const total = TAROT_CARDS.length;
              const mid = Math.floor(total / 2);
              const offset = i - mid;
              const isActive = i === activeCard;

              return (
                <motion.div
                  key={card.name}
                  className="absolute cursor-pointer"
                  style={{
                    top: "50%",
                    left: "50%",
                    transformStyle: "preserve-3d",
                  }}
                  animate={{
                    rotateY: offset * -12,
                    rotateZ: offset * 8,
                    x: offset * 55 - 70,
                    y: isActive ? -50 : 10 + Math.abs(offset) * 10,
                    scale: isActive ? 1.12 : 0.8 - Math.abs(offset) * 0.03,
                    zIndex: isActive ? 10 : total - Math.abs(offset),
                    filter: isActive
                      ? "brightness(1) saturate(1.1)"
                      : `brightness(${0.45 - Math.abs(offset) * 0.05}) saturate(0.7)`,
                  }}
                  transition={{ type: "spring", stiffness: 180, damping: 22 }}
                  onClick={() => setActiveCard(i)}
                  whileHover={{
                    scale: isActive ? 1.15 : 0.88,
                    filter: "brightness(0.9) saturate(1)",
                    transition: { duration: 0.2 },
                  }}
                >
                  <div style={{ marginLeft: -70, marginTop: -115 }}>
                    <RealisticTarotCard
                      card={card}
                      isActive={isActive}
                      offset={offset}
                    />
                  </div>
                </motion.div>
              );
            })}

            {/* Info da carta ativa */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 text-center pointer-events-none"
              key={activeCard}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p
                className="font-display text-sm tracking-[0.35em] uppercase mb-0.5"
                style={{ color: activeCardData.ornamentColor }}
              >
                {activeCardData.name}
              </p>
              <p className="font-body text-[10px] tracking-widest text-muted uppercase">
                {activeCardData.description}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Moon className="w-4 h-4 text-muted/40" />
        <div className="w-[1px] h-8 bg-gradient-to-b from-muted/40 to-transparent" />
      </motion.div>
    </section>
  );
}
