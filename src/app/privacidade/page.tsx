import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function PrivacidadePage() {
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
        <h1 className="font-display text-3xl text-parchment mb-2">Política de Privacidade</h1>
        <p className="text-muted text-xs font-body mb-10">Última atualização: março de 2026</p>

        <div className="space-y-8 font-body text-parchment/80 text-sm leading-relaxed">

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">1. Dados que Coletamos</h2>
            <ul className="space-y-2 list-disc list-inside text-parchment/70">
              <li><strong className="text-parchment">Nome e email</strong> — fornecidos no cadastro</li>
              <li><strong className="text-parchment">Histórico de consultas</strong> — tipo, data, cartas sorteadas e mensagens trocadas com Madame Seraphina</li>
              <li><strong className="text-parchment">Dados de sessão</strong> — cookies de autenticação gerenciados pelo NextAuth</li>
            </ul>
            <p className="mt-3">
              Dados de pagamento (número de cartão, dados bancários) <strong className="text-parchment">não são
              armazenados por nós</strong>. Os pagamentos são processados diretamente pelo MercadoPago,
              sujeitos à política de privacidade deles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">2. Como Usamos os Dados</h2>
            <ul className="space-y-2 list-disc list-inside text-parchment/70">
              <li>Para autenticar sua conta e manter sua sessão ativa</li>
              <li>Para exibir seu histórico de consultas no dashboard</li>
              <li>Para processar e confirmar pagamentos via MercadoPago</li>
              <li>Para fornecer contexto às consultas de tarot (as cartas sorteadas são enviadas à IA)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">3. Compartilhamento de Dados</h2>
            <p>
              <strong className="text-parchment">Não vendemos nem compartilhamos seus dados pessoais com terceiros</strong>,
              exceto nos casos estritamente necessários para a operação do serviço:
            </p>
            <ul className="space-y-2 list-disc list-inside text-parchment/70 mt-3">
              <li><strong className="text-parchment">MercadoPago</strong> — para processar pagamentos PIX</li>
              <li><strong className="text-parchment">Anthropic</strong> — o conteúdo das mensagens de consulta é enviado à API da Anthropic para gerar respostas da IA (sujeito à política deles)</li>
              <li><strong className="text-parchment">Supabase</strong> — armazenamento seguro do banco de dados</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">4. Cookies</h2>
            <p>
              Utilizamos apenas cookies de sessão gerados pelo NextAuth para manter você autenticado.
              Não utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">5. Seus Direitos</h2>
            <p>
              Você pode solicitar a exclusão da sua conta e de todos os seus dados a qualquer momento.
              Para isso, entre em contato pelo email informado na página principal. Processamos
              solicitações de exclusão em até 7 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="font-display text-parchment text-lg mb-3">6. Segurança</h2>
            <p>
              Suas senhas são armazenadas com hash (bcrypt). A comunicação com o servidor é
              criptografada via HTTPS. O banco de dados está hospedado na Supabase com
              autenticação por token.
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
