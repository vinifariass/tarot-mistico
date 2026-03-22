"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, Mail, Lock, User } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = searchParams.get("mode") === "register";

  const [mode, setMode] = useState<"login" | "register">(isRegister ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao criar conta");
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou senha incorretos");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4 relative overflow-hidden">
      {/* Fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-arcane/20 via-void to-void" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-mystic/10 blur-[120px]" />

      {/* Partículas */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-gold/40"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group mb-6">
            <Sparkles className="w-6 h-6 text-gold" />
            <span className="font-display text-xl text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl text-parchment mb-2">
            {mode === "login" ? "Bem-vindo de Volta" : "Inicie Sua Jornada"}
          </h1>
          <p className="text-muted text-sm font-body">
            {mode === "login" ? "As cartas aguardam por você" : "Crie sua conta e consulte o destino"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-abyss border border-mystic/30 rounded-2xl p-8 shadow-[0_0_60px_rgba(123,47,190,0.1)]">

          {/* Toggle login/register */}
          <div className="flex rounded-xl bg-void p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-body font-medium rounded-lg transition-all duration-300 cursor-pointer ${
                  mode === m
                    ? "bg-mystic text-parchment shadow-lg"
                    : "text-muted hover:text-parchment"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar Conta"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required={mode === "register"}
                  className="w-full pl-10 pr-4 py-3 bg-void border border-white/10 focus:border-mystic text-parchment placeholder-muted text-sm font-body rounded-xl outline-none transition-colors"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 bg-void border border-white/10 focus:border-mystic text-parchment placeholder-muted text-sm font-body rounded-xl outline-none transition-colors"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3 bg-void border border-white/10 focus:border-mystic text-parchment placeholder-muted text-sm font-body rounded-xl outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-parchment transition-colors cursor-pointer"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs font-body bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-mystic to-amethyst hover:from-amethyst hover:to-mystic text-parchment font-body font-semibold rounded-xl transition-all duration-300 text-sm hover:shadow-[0_0_30px_rgba(123,47,190,0.4)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-parchment/30 border-t-parchment rounded-full animate-spin" />
                  Aguarde...
                </span>
              ) : mode === "login" ? "Entrar no Portal" : "Criar Minha Conta"}
            </button>
          </form>

          {mode === "register" && (
            <p className="text-muted text-xs font-body text-center mt-4 leading-relaxed">
              Ao criar sua conta você concorda com nossos{" "}
              <Link href="/termos" className="text-gold hover:underline">Termos</Link>{" "}
              e{" "}
              <Link href="/privacidade" className="text-gold hover:underline">Política de Privacidade</Link>.
            </p>
          )}
        </div>

        <p className="text-center text-muted text-xs font-body mt-6">
          <Link href="/" className="hover:text-parchment transition-colors">← Voltar ao início</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
