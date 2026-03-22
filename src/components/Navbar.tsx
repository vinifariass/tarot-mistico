"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-void/80 backdrop-blur-md border-b border-mystic/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 text-gold group-hover:text-gold-light transition-colors" />
            <span className="font-display text-xl text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#cartas" className="text-muted hover:text-parchment transition-colors text-sm tracking-wide">
              As Cartas
            </Link>
            <Link href="#como-funciona" className="text-muted hover:text-parchment transition-colors text-sm tracking-wide">
              Como Funciona
            </Link>
            <Link href="#planos" className="text-muted hover:text-parchment transition-colors text-sm tracking-wide">
              Planos
            </Link>
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-4">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-parchment hover:text-gold transition-colors"
                >
                  Meu Portal
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-muted hover:text-parchment transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-muted hover:text-parchment transition-colors">
                  Entrar
                </Link>
                <Link
                  href="/login?mode=register"
                  className="px-4 py-2 bg-mystic hover:bg-amethyst text-parchment text-sm rounded-lg transition-all duration-300 font-medium border border-mystic/50 hover:border-amethyst"
                >
                  Começar Agora
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-parchment p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-abyss border-t border-mystic/20 px-4 py-4 flex flex-col gap-4">
          <Link href="#cartas" className="text-muted hover:text-parchment text-sm" onClick={() => setOpen(false)}>As Cartas</Link>
          <Link href="#como-funciona" className="text-muted hover:text-parchment text-sm" onClick={() => setOpen(false)}>Como Funciona</Link>
          <Link href="#planos" className="text-muted hover:text-parchment text-sm" onClick={() => setOpen(false)}>Planos</Link>
          <hr className="border-mystic/20" />
          {session ? (
            <>
              <Link href="/dashboard" className="text-parchment text-sm" onClick={() => setOpen(false)}>Meu Portal</Link>
              <button onClick={() => signOut()} className="text-muted text-sm text-left">Sair</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted text-sm" onClick={() => setOpen(false)}>Entrar</Link>
              <Link href="/login?mode=register" className="px-4 py-2 bg-mystic text-parchment text-sm rounded-lg text-center font-medium" onClick={() => setOpen(false)}>Começar Agora</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
