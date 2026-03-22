"use client";

import { motion } from "framer-motion";

const MAJOR_ARCANA = [
  { name: "O Louco", roman: "0", symbol: "☽", meaning: "Novos começos, aventura, inocência", color: "from-yellow-950 to-amber-900" },
  { name: "O Mago", roman: "I", symbol: "⚡", meaning: "Poder, vontade, criatividade", color: "from-purple-950 to-indigo-900" },
  { name: "A Sacerdotisa", roman: "II", symbol: "☾", meaning: "Intuição, mistério, sabedoria oculta", color: "from-blue-950 to-indigo-950" },
  { name: "A Imperatriz", roman: "III", symbol: "♀", meaning: "Fertilidade, natureza, abundância", color: "from-green-950 to-emerald-900" },
  { name: "O Imperador", roman: "IV", symbol: "♂", meaning: "Autoridade, estrutura, liderança", color: "from-red-950 to-rose-900" },
  { name: "O Hierofante", roman: "V", symbol: "✝", meaning: "Tradição, espiritualidade, ensinamento", color: "from-orange-950 to-amber-900" },
  { name: "Os Amantes", roman: "VI", symbol: "♡", meaning: "Amor, escolhas, harmonia", color: "from-pink-950 to-rose-950" },
  { name: "A Força", roman: "VIII", symbol: "∞", meaning: "Coragem, paciência, compaixão", color: "from-amber-950 to-yellow-900" },
];

export function TarotCardsSection() {
  return (
    <section id="cartas" className="py-24 bg-void relative overflow-hidden">
      {/* Decoração de fundo */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mystic/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-abyss/50 to-void pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-gold text-xs font-body tracking-[0.4em] uppercase mb-3 block">Os Arcanos Maiores</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-parchment mb-4">
            O Baralho Sagrado
          </h2>
          <p className="text-muted font-body text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            78 cartas, cada uma com uma mensagem única do universo esperando para guiar seu caminho.
          </p>
        </motion.div>

        {/* Grid de cartas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {MAJOR_ARCANA.map((card, i) => (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="group cursor-pointer"
            >
              <div className={`relative rounded-2xl bg-gradient-to-b ${card.color} border border-white/10 p-5 flex flex-col items-center gap-4 transition-all duration-300 group-hover:border-gold/40 group-hover:shadow-[0_0_30px_rgba(123,47,190,0.3)]`}>
                {/* Número romano */}
                <span className="text-gold/60 text-[10px] font-display tracking-widest">{card.roman}</span>

                {/* Divisor topo */}
                <div className="w-full h-[1px] bg-gold/20" />

                {/* Símbolo */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl text-parchment/90 group-hover:border-gold/30 transition-colors">
                  {card.symbol}
                </div>

                {/* Divisor base */}
                <div className="w-full h-[1px] bg-gold/20" />

                {/* Nome */}
                <div className="text-center">
                  <p className="font-display text-parchment text-xs sm:text-sm tracking-[0.15em] uppercase mb-1">{card.name}</p>
                  <p className="text-muted text-[10px] sm:text-xs font-body leading-relaxed text-center">{card.meaning}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-muted font-body text-sm mb-4">
            + 70 cartas esperando para falar com você
          </p>
          <a
            href="/login?mode=register"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gold/40 hover:border-gold text-gold hover:text-gold-light font-body text-sm rounded-xl transition-all duration-300 hover:bg-gold/10"
          >
            Ver Tiragem Completa
          </a>
        </motion.div>
      </div>
    </section>
  );
}
