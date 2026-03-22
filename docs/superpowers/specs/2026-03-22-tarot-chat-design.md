# Tarot Chat Feature — Design Spec

**Date:** 2026-03-22
**Status:** Draft

---

## Overview

Add a paid per-consultation AI chat feature to TarotMístico. Paying subscribers (R$5/mês) can purchase individual tarot consultations (R$3–R$5 each). Each consultation opens a chat session with an AI tarot reader (Madame Seraphina), powered by Claude Haiku (Anthropic API), with a limit of 5 exchanges per consultation.

---

## Business Model

- **Subscription (R$5/mês):** Platform access — required to purchase consultations
- **Consultation (R$3–R$5 per):** One chat session with the AI tarot reader
  - Família: R$3, 3-card spread
  - Trabalho: R$3, 3-card spread
  - Relacionamento: R$5, Celtic Cross (10 cards)
- **Message limit:** 5 user messages per consultation (controls AI API cost ~$0.01/consultation max)
- **Expiry:** Consultations expire after 7 days if not closed

---

## User Flow

```
Dashboard
  → User clicks "Família R$3"
  → POST /api/consultation/start
      → Creates Consultation (status: pending_payment)
      → Generates PIX payment (reuses payment/create logic)
  → PIX QR screen (reuses existing component)
  → Webhook confirms payment
      → Consultation status → active
      → Redirect to /consulta/[id]
  → Chat screen opens
      → Cards already drawn server-side (fixed for the session)
      → User types first question
      → AI responds (streaming) with card interpretations inline
      → Up to 5 exchanges total
  → Consultation ends (messages exhausted or user closes)
      → Status → closed
      → Appears in Dashboard history
```

---

## Data Model

### New Prisma models (additions to schema.prisma)

```prisma
model Consultation {
  id         String        @id @default(cuid())
  userId     String
  type       String        // "familia" | "trabalho" | "relacionamento"
  status     String        // "pending_payment" | "active" | "closed"
  paymentId  String?       @unique
  cards      Json?         // array of drawn card objects, set at activation
  msgCount   Int           @default(0)
  maxMsgs    Int           @default(5)
  expiresAt  DateTime?
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
  user       User          @relation(fields: [userId], references: [id])
  payment    Payment?      @relation(fields: [paymentId], references: [id])
  messages   ChatMessage[]
}

model ChatMessage {
  id             String       @id @default(cuid())
  consultationId String
  role           String       // "user" | "assistant"
  content        String
  createdAt      DateTime     @default(now())
  consultation   Consultation @relation(fields: [consultationId], references: [id])
}
```

### Changes to existing models

- `Payment` model: add optional `consultationId String? @unique` and `consultation Consultation? @relation("ConsultationPayment", fields: [consultationId], references: [id])`.
- `Consultation` model: `payment Payment? @relation("ConsultationPayment", fields: [paymentId], references: [id])` — use explicit `@relation` name to disambiguate from any other Payment relations.
- `User` model: add `consultations Consultation[]` relation.

---

## Card Data

A JSON file at `src/data/tarot-cards.json` containing all 78 tarot cards with Portuguese metadata:

```json
[
  {
    "id": "major-00",
    "name": "O Louco",
    "numeral": "0",
    "arcana": "major",
    "symbol": "☽",
    "keywords": ["liberdade", "novo começo", "espontaneidade"],
    "uprightMeaning": "...",
    "reversedMeaning": "..."
  }
]
```

Cards are drawn server-side at consultation activation using `crypto.randomInt` (no client influence). The drawn card objects are stored in `Consultation.cards` (JSON) so the session is deterministic.

---

## API Routes

### `POST /api/consultation/start`

**Auth:** Requires active subscription.
**Body:** `{ type: "familia" | "trabalho" | "relacionamento" }`
**Logic:**
1. Verify user has active subscription (status=active, expiresAt > now)
2. Create `Consultation` with `status: pending_payment`
3. Generate PIX payment via MercadoPago (amount based on type)
4. Link payment to consultation via `paymentId`
5. Return: `{ consultationId, paymentId, qrCode, qrCodeBase64, expiresAt }`

### `GET /api/consultation/[id]`

**Auth:** Owner only (userId check).
**Returns:** Consultation with messages, cards, msgCount, maxMsgs, status.

### `POST /api/consultation/[id]/chat`

**Auth:** Owner only.
**Body:** `{ message: string }`
**Guards:**
- Consultation must be `active`
- `msgCount < maxMsgs`
- Message length ≤ 500 chars
**Logic:**
1. Save user message to `ChatMessage`
2. Increment `msgCount`
3. Build messages array from history + system prompt
4. Call Claude Haiku with streaming
5. Save assistant response to `ChatMessage`
6. If `msgCount === maxMsgs`, set `status: closed`
7. Return: streaming text/event-stream

### `activateConsultation(consultationId)` (internal function, not an HTTP route)

Server-side function called directly by the webhook handler (not via HTTP). Draws cards server-side using `crypto.randomInt`, sets `status: active`, sets `expiresAt = now + 7 days`.

---

## Webhook Changes

`/api/webhook/mercadopago` needs to handle two payment types:
- Subscription payments (existing behavior: calls `activateSubscription`)
- Consultation payments (new: calls `activateConsultation(consultationId)`)

Distinguish by checking `Payment.consultationId`: if set, it's a consultation payment.

---

## AI Integration

**Model:** `claude-haiku-4-5-20251001`
**SDK:** `@anthropic-ai/sdk`
**Streaming:** Yes (SSE via `text/event-stream`)

**System prompt:**
```
Você é Madame Seraphina, uma tarotista mística e sábia do TarotMístico.
Você conduz leituras de tarot em português brasileiro com profundidade espiritual e linguagem poética.

Consulta atual:
- Tipo: {tipo_consulta}
- Cartas sorteadas: {cartas_json}
- Esta é a mensagem {n} de {max} desta consulta.

Na primeira mensagem:
1. Apresente brevemente as cartas sorteadas e seus significados simbólicos
2. Conecte as cartas à pergunta específica do usuário
3. Ofereça uma interpretação profunda e personalizada
4. Convide o usuário a aprofundar com as mensagens restantes

Nas demais mensagens:
- Mantenha o contexto das cartas e da pergunta original
- Aprofunde os aspectos que o usuário perguntar
- Na última mensagem (n === max), ofereça uma síntese e encerramento simbólico

Regras:
- Nunca quebre o personagem de Madame Seraphina
- Respostas entre 150–350 palavras
- Linguagem mística mas acessível, nunca fria ou técnica
- Não faça previsões absolutas ("você vai..."), prefira orientações ("as cartas sugerem...")
```

**Token budget:** ~800 input + ~400 output per exchange = ~$0.0003/exchange, ~$0.0015/consultation (5 exchanges). Well within R$3 margin.

---

## Frontend

### `/consulta/[id]` — Chat Page

**Layout (desktop):**
```
Navbar
├── Left panel (cards): drawn cards displayed with name, symbol, keyword chips
└── Right panel (chat): message history + input box + message counter
```

**Layout (mobile):**
- Cards displayed inline inside Seraphina's first message (small card chips, tap to expand in modal)
- Full-screen chat below Navbar
- Message counter as `●●●○○ 3/5` above input

**Components:**
- `ConsultationChat` — main client component with streaming
- `TarotCardChip` — small inline card display (mobile)
- `TarotCardPanel` — sidebar card display (desktop)
- `MessageBubble` — user/assistant message with role styling
- `StreamingMessage` — assistant message with streaming cursor

**Streaming implementation:**
- `fetch` with `ReadableStream` reader
- Optimistic UI: user message appears immediately
- Assistant message builds character by character via SSE
- On stream end, save final message to local state

### Dashboard changes

- "Suas Consultas" section now lists consultations from API
- Each item shows: type icon, date, `msgCount/maxMsgs`, status badge
- Active consultations (< maxMsgs, not expired): clickable → reopens chat
- Consultation type buttons trigger new flow (→ `/api/consultation/start`) instead of static display

---

## Error States

| Scenario | Handling |
|----------|----------|
| No active subscription | Redirect to `/assinar` |
| Consultation not found | 404 page |
| Consultation belongs to another user | 403 |
| Message limit reached | Input disabled, "Nova consulta" button |
| Claude API timeout | Retry message shown, attempt not counted against limit |
| Payment fails | Consultation stays `pending_payment`, user can retry PIX |
| Consultation expired (>7 days) | On-read lazy check: `GET /api/consultation/[id]` marks `closed` if `expiresAt < now` |

---

## Out of Scope

- Human tarot reader joining the chat
- Card images (keeps current symbol-based design)
- Consultation PDF export
- Admin panel for managing consultations
- Push notifications when consultation expires
- Multiple simultaneous active consultations per user

---

## Success Criteria

1. User with active subscription can purchase a consultation via PIX
2. After payment confirmation, chat opens automatically with drawn cards visible
3. AI responds in character as Madame Seraphina, referencing the drawn cards
4. Message counter decrements correctly; input is disabled at limit
5. Consultation appears in Dashboard history and can be reopened if still active
6. Claude API errors do not consume user's message quota
7. All routes return 401/403 for unauthorized access
8. TypeScript compiles with no errors; all existing tests pass
