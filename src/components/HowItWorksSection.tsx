"use client";

import { motion } from "framer-motion";
import { Shuffle, BookOpen, MessageCircle } from "lucide-react";

const STEPS = [
  {
    icon: Shuffle,
    number: "01",
    title: "Escolha sua Tiragem",
    description: "Selecione entre tiragem de 1 carta do dia, Celtic Cross completo ou tiragem de 3 cartas para passado, presente e futuro.",
    color: "text-amethyst",
    border: "border-amethyst/30",
    bg: "bg-amethyst/10",
  },
  {
    icon: BookOpen,
    number: "02",
    title: "Receba Sua Leitura",
    description: "As cartas são reveladas uma a uma com interpretações detalhadas e personalizadas baseadas na sua pergunta ou situação.",
    color: "text-gold",
    border: "border-gold/30",
    bg: "bg-gold/10",
  },
  {
    icon: MessageCircle,
    number: "03",
    title: "Salve & Reflita",
    description: "Guarde suas leituras no diário místico, compare com leituras anteriores e acompanhe os padrões que o universo revela.",
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
            Três passos simples para acessar a sabedoria ancestral das cartas
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-mystic/40 to-transparent z-0" />
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
