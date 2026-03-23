"use client";

import { motion } from "framer-motion";
import { Heart, Briefcase, Users, Check, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";

const CONSULTATIONS = [
  {
    id: "familia",
    icon: Users,
    label: "Família",
    price: 3,
    accent: "#34D399",
    glow: "rgba(52,211,153,0.35)",
    border: "border-emerald-500/40",
    bg: "from-emerald-950/60 to-void",
    iconBg: "bg-emerald-500/15 border-emerald-500/30",
    badge: null,
    features: [
      "Tiragem de 3 cartas",
      "Foco em dinâmica familiar",
      "Interpretação de conflitos",
      "Orientação sobre relacionamentos",
    ],
    description: "Entenda os vínculos, conflitos e a energia que move sua família.",
  },
  {
    id: "trabalho",
    icon: Briefcase,
    label: "Trabalho",
    price: 3,
    accent: "#60A5FA",
    glow: "rgba(96,165,250,0.35)",
    border: "border-blue-500/40",
    bg: "from-blue-950/60 to-void",
    iconBg: "bg-blue-500/15 border-blue-500/30",
    badge: null,
    features: [
      "Tiragem de 3 cartas",
      "Carreira e propósito",
      "Desafios e oportunidades",
      "Timing de decisões",
    ],
    description: "Descubra o que o universo revela sobre sua carreira e próximos passos.",
  },
  {
    id: "relacionamento",
    icon: Heart,
    label: "Relacionamento",
    price: 5,
    accent: "#F472B6",
    glow: "rgba(244,114,182,0.4)",
    border: "border-pink-500/50",
    bg: "from-pink-950/60 via-purple-950/40 to-void",
    iconBg: "bg-pink-500/15 border-pink-500/30",
    badge: "Mais Consultado",
    features: [
      "Celtic Cross (10 cartas)",
      "Passado, presente e futuro",
      "Compatibilidade energética",
      "Obstáculos e potenciais",
      "Orientação espiritual profunda",
    ],
    description: "A tiragem mais completa para amor, paixão e conexões da alma.",
  },
];

function ConsultationCard({ item, index }: { item: typeof CONSULTATIONS[0]; index: number }) {
  const Icon = item.icon;
  const isHighlighted = item.price === 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      className={`relative flex flex-col rounded-2xl bg-gradient-to-b ${item.bg} ${item.border} border p-7 gap-6 ${
        isHighlighted
          ? "shadow-[0_0_60px_rgba(244,114,182,0.15),0_0_120px_rgba(123,47,190,0.1)]"
          : ""
      }`}
    >
      {/* Badge */}
      {item.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gradient-to-r from-gold to-gold-light text-void text-[10px] font-body font-bold tracking-widest uppercase px-4 py-1.5 rounded-full whitespace-nowrap">
          <Sparkles className="w-3 h-3" />
          {item.badge}
        </div>
      )}

      {/* Ícone + Tipo */}
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl ${item.iconBg} border flex items-center justify-center`}
        >
          <Icon className="w-5 h-5" style={{ color: item.accent }} />
        </div>
        <div>
          <p className="font-display text-parchment text-lg tracking-wide">{item.label}</p>
          <p className="text-[11px] font-body tracking-widest uppercase" style={{ color: item.accent + "99" }}>
            {isHighlighted ? "Celtic Cross" : "Tiragem 3 Cartas"}
          </p>
        </div>
      </div>

      {/* Preço */}
      <div className="flex items-baseline gap-1">
        <span className="text-muted text-base font-body">R$</span>
        <span
          className="font-display text-6xl leading-none"
          style={{
            color: "#F0E6FF",
            textShadow: isHighlighted ? `0 0 30px ${item.glow}` : "none",
          }}
        >
          {item.price}
        </span>
        <span className="text-muted text-sm font-body ml-1">por consulta</span>
      </div>

      <p className="text-muted font-body text-sm leading-relaxed -mt-2">
        {item.description}
      </p>

      <div className="h-px" style={{ background: `${item.accent}25` }} />

      {/* Features */}
      <ul className="flex flex-col gap-2.5 flex-1">
        {item.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm font-body">
            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: item.accent }} />
            <span className={isHighlighted ? "text-parchment/90" : "text-parchment/75"}>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/login?mode=register"
        className="group w-full py-3.5 text-center font-body font-semibold text-sm rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
        style={{
          background: isHighlighted
            ? `linear-gradient(135deg, ${item.accent}33, rgba(123,47,190,0.4))`
            : `${item.accent}18`,
          border: `1px solid ${item.accent}50`,
          color: item.accent,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = `${item.accent}30`;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${item.glow}`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = isHighlighted
            ? `linear-gradient(135deg, ${item.accent}33, rgba(123,47,190,0.4))`
            : `${item.accent}18`;
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        Consultar Agora
        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  );
}

export function PricingSection() {
  return (
    <section id="planos" className="py-24 bg-void relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mystic/40 to-transparent" />

      {/* Glow de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-mystic/5 blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-gold text-xs font-body tracking-[0.4em] uppercase mb-3 block">
            Escolha sua Consulta
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-parchment mb-4">
            Cada Área da Sua Vida
          </h2>
          <p className="text-muted font-body text-base max-w-lg mx-auto leading-relaxed">
            Pague apenas pela consulta que você precisa. Sem assinatura, sem compromisso.
            As cartas falam quando você precisar.
          </p>
        </motion.div>

        {/* Cards de consulta */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mt-4">
          {CONSULTATIONS.map((item, i) => (
            <ConsultationCard key={item.id} item={item} index={i} />
          ))}
        </div>

        {/* Como pagar */}
        <motion.div
          className="mt-16 rounded-2xl bg-abyss border border-gold/20 p-6 sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
                <span className="text-gold text-lg font-bold">P</span>
              </div>
              <div>
                <p className="text-parchment text-sm font-body font-semibold">Pagamento via PIX</p>
                <p className="text-muted text-xs font-body">Acesso liberado em minutos</p>
              </div>
            </div>

            <div className="h-px sm:h-8 sm:w-px bg-white/10 w-full sm:w-auto" />

            <div className="flex flex-wrap gap-6 text-sm font-body flex-1">
              {[
                { step: "1", text: "Crie sua conta" },
                { step: "2", text: "Escolha a consulta" },
                { step: "3", text: "Pague via PIX" },
                { step: "4", text: "Leitura liberada!" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] font-bold flex items-center justify-center shrink-0">
                    {step}
                  </span>
                  <span className="text-muted">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          className="mt-10 grid sm:grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          {[
            { q: "Como funciona o pagamento?", a: "Após escolher sua consulta, você recebe a chave PIX. Em até 5 minutos seu acesso é liberado." },
            { q: "Posso fazer mais de uma consulta?", a: "Sim! Cada consulta é paga individualmente. Quanto mais você consulta, mais o universo revela." },
            { q: "As leituras ficam salvas?", a: "Sim, todas as suas consultas e o histórico de mensagens ficam salvos no seu perfil." },
            { q: "É seguro e confidencial?", a: "Totalmente. Suas consultas são privadas e seus dados protegidos com criptografia." },
          ].map(({ q, a }) => (
            <div key={q} className="p-4 rounded-xl bg-abyss border border-white/5">
              <p className="text-parchment text-sm font-body font-medium mb-1">{q}</p>
              <p className="text-muted text-xs font-body leading-relaxed">{a}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
