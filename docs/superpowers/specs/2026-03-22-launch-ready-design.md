# Launch-Ready Design Spec

**Data:** 2026-03-22
**Objetivo:** Preparar o TarotMístico para lançamento até amanhã
**Abordagem:** Minimal (só mudanças de UI/middleware, sem remover código de assinatura do backend)

---

## Contexto

O produto é um app de tarot com consultas pagas por PIX via MercadoPago. Cada consulta é avulsa (R$3–R$5 dependendo do tipo), paga individualmente. O modelo de assinatura mensal foi descartado — o código backend de assinatura permanece mas não é exposto ao usuário.

O site precisa:
- Refletir corretamente o modelo por consulta (não assinatura)
- Ter páginas legais funcionais (termos e privacidade)
- Migrar para PostgreSQL (Supabase) para persistência real
- Ser deployado na Vercel com variáveis de ambiente corretas

---

## 1. Migração PostgreSQL (Supabase)

**Por quê:** SQLite não funciona em ambientes serverless (Vercel). Supabase já está provisionado.

**Procedimento correto:**

1. Alterar `prisma/schema.prisma` — `provider = "sqlite"` → `provider = "postgresql"`
2. Deletar o diretório `prisma/migrations/` — as migrations existentes são SQLite e não são compatíveis com PostgreSQL (tipos, sintaxe e migration lock divergem)
3. Atualizar `DATABASE_URL` no `.env` com a connection string do Supabase
4. Rodar `npx prisma db push` para criar as tabelas diretamente no Supabase (abordagem mais simples para launch day; não gera migration files)
5. Verificar conexão com `npx prisma studio` ou query simples

> **Nota:** `npx prisma migrate deploy` *não* funciona aqui — o migration lock file tem `provider = "sqlite"` e o Prisma rejeita a execução. Usar `db push` ignora esse histórico.

**Connection string:** `postgresql://postgres.tykqswjmxtnywbpikjno:[PASS]@aws-0-us-west-2.pooler.supabase.com:5432/postgres`

---

## 2. Middleware + API — Remover Checagem de Assinatura

### 2a. Middleware (`src/middleware.ts`)
**Situação atual:** `/dashboard` só é acessível se `subscriptionStatus === 'active'` no JWT.
**Mudança:** proteger `/dashboard` apenas com sessão válida (logado = acesso liberado).

### 2b. API consultation/start (`src/app/api/consultation/start/route.ts`)
**Situação atual:** a rota verifica se o usuário tem assinatura ativa antes de criar a consulta (linhas ~27-40). Sem isso, retorna 403.
**Mudança:** remover essa verificação de assinatura. Qualquer usuário logado pode iniciar uma consulta.

> **Crítico:** sem essa mudança, o fluxo de pagamento quebra completamente para todos os usuários novos — o middleware libera o dashboard mas a API bloqueia na hora de pagar.

---

## 3. Landing Page — Remover Linguagem de Assinatura

### 3a. PricingSection (`src/components/PricingSection.tsx`)
- **Já implementado** — cards de consulta avulsa com preços corretos estão no código

### 3b. HowItWorksSection (`src/components/HowItWorksSection.tsx`)
- **Precisa atualizar** os passos para:
  1. Crie sua conta
  2. Escolha o tema da consulta
  3. Pague via PIX (R$3–R$5)
  4. Converse com Madame Seraphina

### 3c. HeroSection (`src/components/HeroSection.tsx`)
- **Já implementado** — copy já reflete modelo por consulta

### 3d. PricingSection FAQ — Remover Referências a PDF
- O FAQ menciona "PDF da leitura salvo" e "ficam salvas em PDF" — funcionalidade inexistente no codebase
- Remover essas referências para não criar expectativa falsa no usuário

---

## 4. Página `/assinar` — Copy Dinâmico

### Com `?consultationId` (vindo do dashboard):
- Título: "Consulta de [Tipo]" (ex: "Consulta de Família")
- Subtítulo: "R$[X] · pagamento único via PIX"
- QR já está no sessionStorage — botão de gerar PIX some
- Se sessionStorage estiver vazio (usuário recarregou a página): mostrar mensagem de erro com botão "Voltar ao dashboard" em vez do botão de assinatura

### Sem `consultationId` (acesso direto):
- Redirecionar para `/dashboard`

### Mudanças necessárias:
- `DashboardClient.tsx` — adicionar `type` e `amount` ao objeto salvo no sessionStorage:
  ```js
  { paymentId, qrCode, qrCodeBase64, expiresAt, type, amount }
  ```
- `src/app/assinar/page.tsx` — ler `type` e `amount` do sessionStorage, renderizar copy correto, redirecionar se sem `consultationId`, mostrar erro se QR expirou/sumiu do sessionStorage

**Mapeamento tipo → preço:**
```
familia      → R$3
trabalho     → R$3
relacionamento → R$5
```

---

## 5. Páginas Legais

### `/termos` (`src/app/termos/page.tsx`)
Página estática. Conteúdo:
- O que é o serviço
- Consultas são entretenimento (não aconselhamento profissional)
- Pagamentos não reembolsáveis
- Responsabilidade do usuário
- Contato

### `/privacidade` (`src/app/privacidade/page.tsx`)
Página estática. Conteúdo:
- Dados coletados: email, histórico de consultas, dados de pagamento (processados pelo MercadoPago)
- Não compartilhamos dados com terceiros
- Cookies de sessão (NextAuth)
- Direito de exclusão (contato por email)

**Visual:** ambas no estilo do site (bg-void, font-display para títulos, font-body para texto, cor parchment/muted). Navbar simples com link home.

---

## 6. Página 404 Customizada

**Arquivo:** `src/app/not-found.tsx`

Conteúdo:
- Símbolo temático (estrelas, cartas)
- Título: "Os astros não encontraram essa página"
- Subtítulo: código 404, mensagem curta
- Botão: "Voltar ao início" → `/`

---

## 7. Variáveis de Ambiente — Produção (Vercel)

Configurar no painel da Vercel **e** declarar em `vercel.json`:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string Supabase |
| `NEXTAUTH_URL` | `https://[dominio].vercel.app` |
| `NEXTAUTH_SECRET` | String aleatória (`openssl rand -base64 32`) |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de produção do MP |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret configurado no painel do MP |
| `ANTHROPIC_API_KEY` | Key da Anthropic |
| `NEXT_PUBLIC_BASE_URL` | `https://[dominio].vercel.app` — usado como URL de callback do MP webhook |

> **Crítico:** `MERCADOPAGO_ACCESS_TOKEN` não declarado faz o build da Vercel falhar (o singleton do MP lança erro síncrono). `NEXT_PUBLIC_BASE_URL` indefinido faz o webhook do MP receber URL quebrada e os pagamentos nunca são confirmados.

---

## 8. Guia MercadoPago Produção

**Arquivo:** `docs/mercadopago-producao.md`

Conteúdo:
1. Como obter o Access Token de produção no painel do MP
2. Como configurar o webhook URL: `https://[dominio]/api/webhook/mercadopago`
3. Como configurar o Webhook Secret no MP e copiar para o `.env` / Vercel
4. Como testar um pagamento real antes de anunciar

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `prisma/schema.prisma` | Modificar — provider sqlite → postgresql |
| `prisma/migrations/` | Deletar — incompatível com PostgreSQL |
| `src/middleware.ts` | Modificar — remover checagem subscriptionStatus |
| `src/app/api/consultation/start/route.ts` | Modificar — remover checagem de assinatura |
| `src/components/HowItWorksSection.tsx` | Modificar — passos atualizados |
| `src/components/PricingSection.tsx` | Modificar — remover referências a PDF no FAQ |
| `src/app/assinar/page.tsx` | Modificar — copy dinâmico + redirect + erro se QR expirado |
| `src/app/dashboard/DashboardClient.tsx` | Modificar — salvar type + amount no sessionStorage |
| `src/app/termos/page.tsx` | Criar |
| `src/app/privacidade/page.tsx` | Criar |
| `src/app/not-found.tsx` | Criar |
| `vercel.json` | Modificar — adicionar todas as env vars |
| `docs/mercadopago-producao.md` | Criar |

---

## Fora de Escopo

- Remoção do código backend de assinatura (`/api/payment/create`, `activateSubscription`, modelo `Subscription`)
- OAuth providers
- Configurações de conta / troca de senha
- Email verification
- Admin dashboard
- PDF export de consultas
- Otimização de região Vercel ↔ Supabase (us-west-2)
