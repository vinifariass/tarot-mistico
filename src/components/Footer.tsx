import { Sparkles } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-void border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="font-display text-lg text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted font-body">
            <Link href="/privacidade" className="hover:text-parchment transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-parchment transition-colors">Termos</Link>
            <a href="mailto:contato@tarotmistico.com" className="hover:text-parchment transition-colors">Contato</a>
          </div>

          <p className="text-muted text-xs font-body text-center">
            © 2025 TarotMístico. Feito com ✦ e muita intuição.
          </p>
        </div>
      </div>
    </footer>
  );
}
