# Configurar MercadoPago para Produção

## 1. Obter as Credenciais de Produção

1. Acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Vá em **Suas integrações** → selecione sua aplicação
3. Clique em **Credenciais de produção**
4. Copie o **Access Token** (começa com `APP_USR-...`)

## 2. Configurar o Webhook no Painel do MP

1. No painel do MP, vá em **Suas integrações** → sua aplicação → **Webhooks**
2. Clique em **Adicionar URL de webhook**
3. URL: `https://[seu-dominio].vercel.app/api/webhook/mercadopago`
4. Eventos: marque **Pagamentos** (`payment`)
5. Salve e copie o **Secret do webhook** (será usado como `MERCADOPAGO_WEBHOOK_SECRET`)

## 3. Configurar Variáveis na Vercel

Acesse o painel da Vercel → seu projeto → **Settings** → **Environment Variables**. Adicione:

| Nome | Valor | Environments |
|------|-------|--------------|
| `DATABASE_URL` | `postgresql://postgres.tykqswjmxtnywbpikjno:[PASS]@aws-0-us-west-2.pooler.supabase.com:5432/postgres` | Production, Preview |
| `NEXTAUTH_URL` | `https://[seu-dominio].vercel.app` | Production |
| `NEXTAUTH_SECRET` | resultado de `openssl rand -base64 32` | Production, Preview |
| `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-...` (token de produção) | Production |
| `MERCADOPAGO_WEBHOOK_SECRET` | secret copiado do painel do MP | Production |
| `ANTHROPIC_API_KEY` | sua API key da Anthropic | Production |
| `NEXT_PUBLIC_BASE_URL` | `https://[seu-dominio].vercel.app` | Production |

> ⚠️ `NEXT_PUBLIC_BASE_URL` precisa ser a URL exata sem barra no final.
> É usada para montar a URL de callback do webhook do MP.
> Se estiver errada, os pagamentos nunca serão confirmados.

## 4. Testar Antes de Anunciar

1. Faça deploy na Vercel
2. Crie uma conta de teste no site
3. Inicie uma consulta no dashboard
4. Pague o PIX real (R$3)
5. Aguarde a confirmação (até 5 minutos)
6. Verifique se a consulta abre no `/consulta/[id]`

Se a consulta não abrir após o pagamento, o problema está no webhook:
- Verifique se a URL do webhook no painel do MP está correta
- Verifique se `MERCADOPAGO_WEBHOOK_SECRET` está correto na Vercel
- Verifique os logs da função em Vercel → Functions → `/api/webhook/mercadopago`
