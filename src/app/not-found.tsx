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
