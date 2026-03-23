import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-void">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-b border-mystic/20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="font-display text-lg text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <h1 className="font-display text-3xl text-parchment mb-2">Termos de Uso</h1>
        <p className="text-muted text-xs font-body mb-10">Última atualização: março de 2026</p>

        <div className="space-y-8 font-body text-parchment/80 text-sm leading-relaxed">

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">1. Sobre o Serviço</h2>
            <p>
              O TarotMístico é uma plataforma de entretenimento e reflexão espiritual que oferece
              consultas de tarot mediadas por inteligência artificial. As consultas são realizadas
              por Madame Seraphina, uma personagem fictícia baseada em IA.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">2. Natureza do Serviço</h2>
            <p>
              As consultas de tarot oferecidas pelo TarotMístico têm <strong className="text-parchment">caráter
              exclusivamente de entretenimento e reflexão pessoal</strong>. Elas não constituem, em hipótese
              alguma, aconselhamento profissional médico, psicológico, jurídico, financeiro ou de
              qualquer outra natureza técnica ou regulamentada.
            </p>
            <p className="mt-3">
              Não tome decisões importantes de vida baseado exclusivamente nas consultas realizadas
              nesta plataforma. Consulte profissionais habilitados para questões de saúde, finanças
              ou assuntos jurídicos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">3. Pagamentos</h2>
            <p>
              Cada consulta é paga individualmente via PIX, nos valores de R$3 (Família ou Trabalho)
              ou R$5 (Relacionamento). O acesso à consulta é liberado após a confirmação do pagamento
              pelo MercadoPago.
            </p>
            <p className="mt-3">
              <strong className="text-parchment">Os pagamentos não são reembolsáveis</strong> após a
              ativação da consulta. Caso o pagamento não seja confirmado dentro do prazo de expiração
              do QR Code (30 minutos), a consulta é cancelada automaticamente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">4. Conta do Usuário</h2>
            <p>
              Você é responsável pela segurança da sua conta e senha. Não compartilhe suas
              credenciais com terceiros. O TarotMístico não se responsabiliza por acessos
              não autorizados decorrentes da negligência do usuário.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">5. Limitação de Responsabilidade</h2>
            <p>
              O TarotMístico fornece o serviço "como está", sem garantias de continuidade,
              disponibilidade ininterrupta ou resultados específicos. Não nos responsabilizamos
              por decisões tomadas com base nas consultas realizadas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">6. Contato</h2>
            <p>
              Dúvidas sobre estes termos? Entre em contato pelo email informado na página principal.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10">
          <Link href="/" className="text-muted text-xs font-body hover:text-parchment transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
