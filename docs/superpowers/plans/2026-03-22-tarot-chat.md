# Tarot Chat Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add paid per-consultation AI chat (Madame Seraphina via Claude Haiku) so subscribers can purchase tarot readings and chat with the AI about their drawn cards.

**Architecture:** Each consultation is purchased via PIX (reusing existing payment flow), then unlocks a chat session at `/consulta/[id]` where the user asks questions and Claude Haiku responds as a tarot reader, with 5 message limit per consultation. Consultation history surfaces in the Dashboard.

**Tech Stack:** Next.js 15 App Router, Prisma 6 + SQLite, NextAuth v4, `@anthropic-ai/sdk`, Framer Motion, Tailwind CSS, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | Modify | Add Consultation, ChatMessage models; add consultationId to Payment |
| `src/data/tarot-cards.json` | Create | 78-card deck with PT-BR names, symbols, meanings |
| `src/lib/anthropic.ts` | Create | Anthropic SDK singleton |
| `src/lib/consultation.ts` | Create | `drawCards()`, `activateConsultation()`, `buildSystemPrompt()` |
| `src/app/api/consultation/start/route.ts` | Create | POST — create consultation + PIX |
| `src/app/api/consultation/[id]/route.ts` | Create | GET — fetch consultation + messages |
| `src/app/api/consultation/[id]/chat/route.ts` | Create | POST — stream Claude Haiku response |
| `src/app/api/webhook/mercadopago/route.ts` | Modify | Handle consultation payments in addition to subscription |
| `src/app/consulta/[id]/page.tsx` | Create | Server component — auth + ownership check |
| `src/app/consulta/[id]/ConsultationChat.tsx` | Create | Client component — full chat UI |
| `src/app/api/consultations/route.ts` | Create | GET list of user's consultations (history) |
| `src/app/dashboard/DashboardClient.tsx` | Modify | Wire consultation buttons + show history |
| `src/tests/consultation.test.ts` | Create | Unit tests for consultation lib helpers |
| `src/tests/consultation-api.test.ts` | Create | Tests for start + chat routes |

---

## Task 1: Install Anthropic SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the SDK**

```bash
cd C:/tmp/tarot-mistico && npm install @anthropic-ai/sdk
```

Expected: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Verify TypeScript sees it**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd C:/tmp/tarot-mistico && git add package.json package-lock.json && git commit -m "chore: add @anthropic-ai/sdk"
```

---

## Task 2: Prisma Schema — Consultation + ChatMessage

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `prisma migrate dev`

- [ ] **Step 1: Add models to schema**

Open `prisma/schema.prisma`. Add after the `Payment` model:

```prisma
model Consultation {
  id        String        @id @default(cuid())
  userId    String
  type      String        // "familia" | "trabalho" | "relacionamento"
  status    String        @default("pending_payment") // pending_payment | active | closed
  paymentId String?       @unique
  cards     Json?
  msgCount  Int           @default(0)
  maxMsgs   Int           @default(5)
  expiresAt DateTime?
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  payment  Payment?      @relation("ConsultationPayment", fields: [paymentId], references: [id])
  messages ChatMessage[]
}

model ChatMessage {
  id             String       @id @default(cuid())
  consultationId String
  role           String       // "user" | "assistant"
  content        String
  createdAt      DateTime     @default(now())

  consultation Consultation @relation(fields: [consultationId], references: [id], onDelete: Cascade)
}
```

Also modify the `Payment` model — add after `updatedAt`:
```prisma
  consultationId String?      @unique
  consultation   Consultation? @relation("ConsultationPayment")
```

Also modify the `User` model — add after `payments Payment[]`:
```prisma
  consultations Consultation[]
```

- [ ] **Step 2: Run migration**

```bash
cd C:/tmp/tarot-mistico && npx prisma migrate dev --name add_consultation_chat
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd C:/tmp/tarot-mistico && git add prisma/ && git commit -m "feat: add Consultation and ChatMessage models"
```

---

## Task 3: Tarot Cards Data + Anthropic Singleton

**Files:**
- Create: `src/data/tarot-cards.json`
- Create: `src/lib/anthropic.ts`

- [ ] **Step 1: Create tarot cards data file**

Create `src/data/tarot-cards.json` with all 22 Major Arcana + a representative set of Minor Arcana (total ≥ 22 cards minimum, ideally 78). Each card must have: id, name, numeral, arcana, symbol, keywords (array), uprightMeaning (string ~30 words PT-BR).

```json
[
  {
    "id": "major-00",
    "name": "O Louco",
    "numeral": "0",
    "arcana": "major",
    "symbol": "☽",
    "keywords": ["liberdade", "novo começo", "espontaneidade", "aventura"],
    "uprightMeaning": "Um novo ciclo começa. A coragem de dar o salto sem garantias. Abertura para o desconhecido e confiança no universo para guiar o caminho."
  },
  {
    "id": "major-01",
    "name": "O Mago",
    "numeral": "I",
    "arcana": "major",
    "symbol": "✦",
    "keywords": ["vontade", "habilidade", "manifestação", "poder"],
    "uprightMeaning": "Você tem todos os recursos necessários. Momento de agir com intenção e transformar pensamentos em realidade através do foco e determinação."
  },
  {
    "id": "major-02",
    "name": "A Sacerdotisa",
    "numeral": "II",
    "arcana": "major",
    "symbol": "☽",
    "keywords": ["intuição", "sabedoria oculta", "mistério", "paciência"],
    "uprightMeaning": "Confie na sua voz interior. O silêncio revela verdades que o barulho esconde. Sabedoria vem de dentro, não de fora."
  },
  {
    "id": "major-03",
    "name": "A Imperatriz",
    "numeral": "III",
    "arcana": "major",
    "symbol": "♀",
    "keywords": ["abundância", "fertilidade", "criatividade", "natureza"],
    "uprightMeaning": "Tempo de florescimento e criação. Abundância material e emocional. Cuide do que planta pois a colheita será farta."
  },
  {
    "id": "major-04",
    "name": "O Imperador",
    "numeral": "IV",
    "arcana": "major",
    "symbol": "♂",
    "keywords": ["autoridade", "estrutura", "estabilidade", "liderança"],
    "uprightMeaning": "Estabeleça bases sólidas. Lidere com responsabilidade e clareza. A ordem cria o espaço para que tudo floresça."
  },
  {
    "id": "major-05",
    "name": "O Hierofante",
    "numeral": "V",
    "arcana": "major",
    "symbol": "✝",
    "keywords": ["tradição", "espiritualidade", "guia", "convenção"],
    "uprightMeaning": "Busque ensinamentos de quem trilhou o caminho antes. A sabedoria coletiva e as tradições têm valor profundo neste momento."
  },
  {
    "id": "major-06",
    "name": "Os Amantes",
    "numeral": "VI",
    "arcana": "major",
    "symbol": "♡",
    "keywords": ["amor", "escolha", "harmonia", "valores"],
    "uprightMeaning": "Uma escolha importante se apresenta. Alinhe suas decisões com seus valores mais profundos. O amor verdadeiro começa pela escolha consciente."
  },
  {
    "id": "major-07",
    "name": "O Carro",
    "numeral": "VII",
    "arcana": "major",
    "symbol": "◈",
    "keywords": ["vitória", "determinação", "controle", "movimento"],
    "uprightMeaning": "Avance com determinação. A vitória vem para quem mantém o foco e equilibra forças opostas com maestria e disciplina."
  },
  {
    "id": "major-08",
    "name": "A Força",
    "numeral": "VIII",
    "arcana": "major",
    "symbol": "∞",
    "keywords": ["coragem", "paciência", "compaixão", "autocontrole"],
    "uprightMeaning": "A verdadeira força é gentil. Domine seus impulsos com compaixão. A paciência e o amor próprio vencem onde a força bruta falha."
  },
  {
    "id": "major-09",
    "name": "O Eremita",
    "numeral": "IX",
    "arcana": "major",
    "symbol": "☯",
    "keywords": ["introspecção", "solidão", "sabedoria", "busca interior"],
    "uprightMeaning": "Um período de recolhimento traz clareza. Afaste-se do ruído externo. As respostas que você busca estão no silêncio interno."
  },
  {
    "id": "major-10",
    "name": "A Roda da Fortuna",
    "numeral": "X",
    "arcana": "major",
    "symbol": "⊕",
    "keywords": ["ciclos", "destino", "mudança", "sorte"],
    "uprightMeaning": "Os ciclos giram. O que estava baixo sobe, o que estava alto muda. Flua com as mudanças em vez de resistir ao inevitável."
  },
  {
    "id": "major-11",
    "name": "A Justiça",
    "numeral": "XI",
    "arcana": "major",
    "symbol": "⚖",
    "keywords": ["justiça", "verdade", "causa e efeito", "equilíbrio"],
    "uprightMeaning": "Cada ação tem consequência. Seja honesto consigo mesmo. O equilíbrio será restaurado e a verdade prevalecerá."
  },
  {
    "id": "major-12",
    "name": "O Enforcado",
    "numeral": "XII",
    "arcana": "major",
    "symbol": "⊥",
    "keywords": ["pausa", "rendição", "perspectiva diferente", "sacrifício"],
    "uprightMeaning": "Pause voluntariamente. Ver as coisas de um ângulo diferente revela soluções invisíveis antes. A rendição consciente traz iluminação."
  },
  {
    "id": "major-13",
    "name": "A Morte",
    "numeral": "XIII",
    "arcana": "major",
    "symbol": "☠",
    "keywords": ["transformação", "fim de ciclo", "renovação", "mudança"],
    "uprightMeaning": "Não é fim — é transformação. Algo precisa morrer para que o novo nasça. Solte o que não serve mais com gratidão."
  },
  {
    "id": "major-14",
    "name": "A Temperança",
    "numeral": "XIV",
    "arcana": "major",
    "symbol": "△",
    "keywords": ["equilíbrio", "moderação", "paciência", "integração"],
    "uprightMeaning": "Equilíbrio entre extremos. Misture com cuidado os opostos da sua vida. A moderação e a paciência criam a alquimia perfeita."
  },
  {
    "id": "major-15",
    "name": "O Diabo",
    "numeral": "XV",
    "arcana": "major",
    "symbol": "⛧",
    "keywords": ["apegos", "ilusões", "materialismo", "sombras"],
    "uprightMeaning": "Examine seus apegos e padrões que te prendem. O que te limita tem menos poder do que imagina. A consciência é a chave da libertação."
  },
  {
    "id": "major-16",
    "name": "A Torre",
    "numeral": "XVI",
    "arcana": "major",
    "symbol": "⚡",
    "keywords": ["ruptura", "revelação", "caos transformador", "verdade"],
    "uprightMeaning": "O que foi construído sobre bases falsas cairá. A destruição repentina abre espaço para algo mais verdadeiro e sólido emergir."
  },
  {
    "id": "major-17",
    "name": "A Estrela",
    "numeral": "XVII",
    "arcana": "major",
    "symbol": "★",
    "keywords": ["esperança", "renovação", "inspiração", "cura"],
    "uprightMeaning": "Após a tempestade, a estrela guia. Esperança renovada e cura profunda chegam. Confie que o universo está tecendo algo belo para você."
  },
  {
    "id": "major-18",
    "name": "A Lua",
    "numeral": "XVIII",
    "arcana": "major",
    "symbol": "☽",
    "keywords": ["intuição", "ilusão", "subconsciente", "mistério"],
    "uprightMeaning": "Caminhe pela névoa com cuidado. Nem tudo é o que parece. Confie nos seus instintos mais do que nas aparências externas."
  },
  {
    "id": "major-19",
    "name": "O Sol",
    "numeral": "XIX",
    "arcana": "major",
    "symbol": "☀",
    "keywords": ["alegria", "sucesso", "vitalidade", "clareza"],
    "uprightMeaning": "Brilhe sem hesitar. Alegria genuína, sucesso e clareza iluminam seu caminho. É tempo de celebrar e compartilhar sua luz com o mundo."
  },
  {
    "id": "major-20",
    "name": "O Julgamento",
    "numeral": "XX",
    "arcana": "major",
    "symbol": "⚜",
    "keywords": ["chamado", "avaliação", "renascimento", "absolvição"],
    "uprightMeaning": "Um chamado interior ressoa. Avalie sua jornada com honestidade e compaixão. O renascimento espiritual pede que você responda com coragem."
  },
  {
    "id": "major-21",
    "name": "O Mundo",
    "numeral": "XXI",
    "arcana": "major",
    "symbol": "◯",
    "keywords": ["completude", "integração", "conquista", "totalidade"],
    "uprightMeaning": "Um ciclo se completa com maestria. Você integrou as lições desta jornada. Celebre a conquista — o universo reconhece sua plenitude."
  },
  {
    "id": "cups-01",
    "name": "Ás de Copas",
    "numeral": "Ás",
    "arcana": "minor",
    "suit": "copas",
    "symbol": "♡",
    "keywords": ["amor novo", "abertura emocional", "intuição", "abundância"],
    "uprightMeaning": "Novo amor ou conexão emocional profunda se abre. O coração está pronto para receber e dar. Intuição aguçada guia o caminho afetivo."
  },
  {
    "id": "cups-02",
    "name": "Dois de Copas",
    "numeral": "II",
    "arcana": "minor",
    "suit": "copas",
    "symbol": "♡",
    "keywords": ["parceria", "conexão mútua", "harmonia", "compromisso"],
    "uprightMeaning": "União harmoniosa e conexão genuína entre duas pessoas. Parceria baseada em respeito e amor verdadeiro. Momento propício para compromissos."
  },
  {
    "id": "cups-03",
    "name": "Três de Copas",
    "numeral": "III",
    "arcana": "minor",
    "suit": "copas",
    "symbol": "♡",
    "keywords": ["celebração", "amizade", "comunidade", "alegria"],
    "uprightMeaning": "Celebre com aqueles que ama. Amizades florescem e a comunidade apoia. É tempo de gratidão e alegria compartilhada."
  },
  {
    "id": "wands-01",
    "name": "Ás de Paus",
    "numeral": "Ás",
    "arcana": "minor",
    "suit": "paus",
    "symbol": "🔥",
    "keywords": ["inspiração", "novo projeto", "energia criativa", "potencial"],
    "uprightMeaning": "Uma faísca de inspiração acende um novo projeto. Energia criativa em abundância. Aja enquanto o entusiasmo está vivo."
  },
  {
    "id": "wands-07",
    "name": "Sete de Paus",
    "numeral": "VII",
    "arcana": "minor",
    "suit": "paus",
    "symbol": "🔥",
    "keywords": ["desafio", "perseverança", "defesa", "posição"],
    "uprightMeaning": "Defenda sua posição com convicção. Os desafios testam sua determinação mas você tem a vantagem. Persevere sem recuar."
  },
  {
    "id": "swords-01",
    "name": "Ás de Espadas",
    "numeral": "Ás",
    "arcana": "minor",
    "suit": "espadas",
    "symbol": "⚔",
    "keywords": ["clareza mental", "verdade", "nova perspectiva", "justiça"],
    "uprightMeaning": "Clareza mental cortante revela a verdade. Momento de decisões baseadas na razão. A mente afiada distingue o essencial do supérfluo."
  },
  {
    "id": "pentacles-01",
    "name": "Ás de Ouros",
    "numeral": "Ás",
    "arcana": "minor",
    "suit": "ouros",
    "symbol": "⬡",
    "keywords": ["oportunidade material", "prosperidade", "manifestação", "recursos"],
    "uprightMeaning": "Nova oportunidade material ou financeira se apresenta. Prosperidade concreta à vista. Plante as sementes agora para colher depois."
  }
]
```

> **Note:** The implementer should expand this to all 78 cards (14 per suit × 4 suits = 56 minor + 22 major). The 22 major arcana above are complete; add the remaining 52 minor arcana cards following the same structure. Use `id` format `"cups-01"` through `"cups-14"`, `"wands-01"` through `"wands-14"`, `"swords-01"` through `"swords-14"`, `"pentacles-01"` through `"pentacles-14"`.

- [ ] **Step 2: Create Anthropic singleton**

Create `src/lib/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default anthropic
```

- [ ] **Step 3: Add ANTHROPIC_API_KEY to .env.example**

Open `.env.example` (or create if missing) and add:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

- [ ] **Step 4: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/data/tarot-cards.json src/lib/anthropic.ts && git commit -m "feat: add tarot cards data and Anthropic SDK singleton"
```

---

## Task 4: Consultation Library — drawCards + activateConsultation + buildSystemPrompt

**Files:**
- Create: `src/lib/consultation.ts`
- Create: `src/tests/consultation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/consultation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    consultation: {
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { drawCards, buildSystemPrompt } from '@/lib/consultation'

describe('drawCards', () => {
  it('returns the requested number of unique cards', () => {
    const cards = drawCards(3)
    expect(cards).toHaveLength(3)
    const ids = cards.map((c) => c.id)
    expect(new Set(ids).size).toBe(3) // all unique
  })

  it('returns 10 cards for relacionamento', () => {
    const cards = drawCards(10)
    expect(cards).toHaveLength(10)
  })

  it('each card has required fields', () => {
    const [card] = drawCards(1)
    expect(card).toHaveProperty('id')
    expect(card).toHaveProperty('name')
    expect(card).toHaveProperty('symbol')
    expect(card).toHaveProperty('keywords')
    expect(card).toHaveProperty('uprightMeaning')
  })
})

describe('buildSystemPrompt', () => {
  it('includes consultation type', () => {
    const cards = drawCards(3)
    const prompt = buildSystemPrompt('familia', cards, 1, 5)
    expect(prompt).toContain('Família')
  })

  it('includes card names', () => {
    const cards = drawCards(1)
    const prompt = buildSystemPrompt('trabalho', cards, 1, 5)
    expect(prompt).toContain(cards[0].name)
  })

  it('includes message counter', () => {
    const cards = drawCards(3)
    const prompt = buildSystemPrompt('familia', cards, 3, 5)
    expect(prompt).toContain('3')
    expect(prompt).toContain('5')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/tmp/tarot-mistico && npm test -- src/tests/consultation.test.ts
```

Expected: FAIL — `drawCards` and `buildSystemPrompt` not found.

- [ ] **Step 3: Implement consultation.ts**

Create `src/lib/consultation.ts`:

```typescript
import { randomInt } from 'crypto'
import prisma from '@/lib/prisma'
import cardsData from '@/data/tarot-cards.json'

export type TarotCard = {
  id: string
  name: string
  numeral: string
  arcana: string
  symbol: string
  keywords: string[]
  uprightMeaning: string
  suit?: string
}

const ALL_CARDS: TarotCard[] = cardsData as TarotCard[]

export function drawCards(count: number): TarotCard[] {
  const deck = [...ALL_CARDS]
  const drawn: TarotCard[] = []
  for (let i = 0; i < count && deck.length > 0; i++) {
    const idx = randomInt(0, deck.length)
    drawn.push(deck[idx])
    deck.splice(idx, 1)
  }
  return drawn
}

const TYPE_LABELS: Record<string, string> = {
  familia: 'Família',
  trabalho: 'Trabalho',
  relacionamento: 'Relacionamento',
}

export function buildSystemPrompt(
  type: string,
  cards: TarotCard[],
  msgNumber: number,
  maxMsgs: number
): string {
  const cardsText = cards
    .map(
      (c, i) =>
        `Carta ${i + 1}: ${c.name} (${c.numeral}) — ${c.keywords.join(', ')}. ${c.uprightMeaning}`
    )
    .join('\n')

  return `Você é Madame Seraphina, uma tarotista mística e sábia do TarotMístico.
Você conduz leituras de tarot em português brasileiro com profundidade espiritual e linguagem poética.

Consulta atual:
- Tipo: ${TYPE_LABELS[type] ?? type}
- Cartas sorteadas:
${cardsText}
- Esta é a mensagem ${msgNumber} de ${maxMsgs} desta consulta.

Na primeira mensagem:
1. Apresente brevemente as cartas e seus significados simbólicos
2. Conecte as cartas à pergunta específica do usuário
3. Ofereça uma interpretação profunda e personalizada
4. Convide o usuário a aprofundar com as mensagens restantes

Nas demais mensagens:
- Mantenha o contexto das cartas e da pergunta original
- Aprofunde os aspectos que o usuário perguntar
- Na última mensagem (${msgNumber} === ${maxMsgs}), ofereça uma síntese e encerramento simbólico

Regras:
- Nunca quebre o personagem de Madame Seraphina
- Respostas entre 150–350 palavras
- Linguagem mística mas acessível, nunca fria ou técnica
- Não faça previsões absolutas ("você vai..."), prefira orientações ("as cartas sugerem...")`
}

const CARD_COUNT: Record<string, number> = {
  familia: 3,
  trabalho: 3,
  relacionamento: 10,
}

export async function activateConsultation(consultationId: string): Promise<void> {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { type: true },
  })
  if (!consultation) return

  const count = CARD_COUNT[consultation.type] ?? 3
  const cards = drawCards(count)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days

  await prisma.consultation.update({
    where: { id: consultationId },
    data: {
      status: 'active',
      cards: JSON.stringify(cards),
      expiresAt,
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/tmp/tarot-mistico && npm test -- src/tests/consultation.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/lib/consultation.ts src/tests/consultation.test.ts && git commit -m "feat: add consultation library (drawCards, buildSystemPrompt, activateConsultation)"
```

---

## Task 5: POST /api/consultation/start

**Files:**
- Create: `src/app/api/consultation/start/route.ts`
- Create: `src/tests/consultation-start.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/consultation-start.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ authOptions: {} }))

vi.mock('@/lib/prisma', () => ({
  default: {
    payment: { updateMany: vi.fn(), create: vi.fn() },
    consultation: { create: vi.fn(), update: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/mercadopago', () => ({
  mpPayment: { create: vi.fn() },
}))

import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'
import { POST } from '@/app/api/consultation/start/route'

const mockSession = { user: { id: 'user-1', email: 'a@b.com' } }
const mockMpResponse = {
  id: 'mp-123',
  point_of_interaction: {
    transaction_data: { qr_code: 'qr', qr_code_base64: 'b64' },
  },
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/consultation/start', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ type: 'familia' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when subscription is inactive', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      status: 'inactive',
    } as any)
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ type: 'familia' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid consultation type', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      status: 'active',
      expiresAt: new Date(Date.now() + 1000000),
    } as any)
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ type: 'invalid' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates consultation and returns payment data on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      status: 'active',
      expiresAt: new Date(Date.now() + 1000000),
    } as any)
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(mpPayment.create).mockResolvedValue(mockMpResponse as any)
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'pay-1' } as any)
    vi.mocked(prisma.consultation.create).mockResolvedValue({ id: 'con-1' } as any)
    vi.mocked(prisma.consultation.update).mockResolvedValue({} as any)

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ type: 'familia' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('consultationId')
    expect(data).toHaveProperty('qr_code')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd C:/tmp/tarot-mistico && npm test -- src/tests/consultation-start.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the route**

Create `src/app/api/consultation/start/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'

const PRICES: Record<string, number> = {
  familia: 3.0,
  trabalho: 3.0,
  relacionamento: 5.0,
}

const DESCRIPTIONS: Record<string, string> = {
  familia: 'TarotMístico — Consulta Família',
  trabalho: 'TarotMístico — Consulta Trabalho',
  relacionamento: 'TarotMístico — Consulta Relacionamento',
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Check active subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, expiresAt: true },
  })
  if (
    !subscription ||
    subscription.status !== 'active' ||
    (subscription.expiresAt && subscription.expiresAt < new Date())
  ) {
    return NextResponse.json(
      { error: 'Assinatura inativa. Assine para continuar.' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { type } = body as { type: string }

  if (!PRICES[type]) {
    return NextResponse.json(
      { error: 'Tipo de consulta inválido' },
      { status: 400 }
    )
  }

  // Expire old pending payments for this user
  await prisma.payment.updateMany({
    where: { userId, status: 'pending' },
    data: { status: 'expired' },
  })

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 min

  const mpResponse = await mpPayment.create({
    body: {
      transaction_amount: PRICES[type],
      payment_method_id: 'pix',
      payer: { email: session.user.email! },
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/mercadopago`,
      date_of_expiration: expiresAt.toISOString(),
      description: DESCRIPTIONS[type],
    },
  })

  const txData = mpResponse.point_of_interaction?.transaction_data
  if (!txData?.qr_code || !txData?.qr_code_base64) {
    return NextResponse.json({ error: 'Falha ao gerar QR Code' }, { status: 500 })
  }

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      userId,
      mpPaymentId: String(mpResponse.id),
      status: 'pending',
      amount: PRICES[type],
      qrCode: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      expiresAt,
    },
  })

  // Create consultation linked to this payment
  const consultation = await prisma.consultation.create({
    data: {
      userId,
      type,
      status: 'pending_payment',
      paymentId: payment.id,
    },
  })

  // Link payment back to consultation
  await prisma.payment.update({
    where: { id: payment.id },
    data: { consultationId: consultation.id },
  })

  return NextResponse.json({
    consultationId: consultation.id,
    payment_id: payment.id,
    qr_code: txData.qr_code,
    qr_code_base64: txData.qr_code_base64,
    expires_at: expiresAt.toISOString(),
  })
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
cd C:/tmp/tarot-mistico && npm test -- src/tests/consultation-start.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/api/consultation/start/ src/tests/consultation-start.test.ts && git commit -m "feat: POST /api/consultation/start"
```

---

## Task 6: GET /api/consultation/[id] + Webhook Update

**Files:**
- Create: `src/app/api/consultation/[id]/route.ts`
- Modify: `src/app/api/webhook/mercadopago/route.ts`

- [ ] **Step 1: Implement GET /api/consultation/[id]**

Create `src/app/api/consultation/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!consultation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (consultation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Lazy expiry check
  if (
    consultation.status === 'active' &&
    consultation.expiresAt &&
    consultation.expiresAt < new Date()
  ) {
    await prisma.consultation.update({
      where: { id },
      data: { status: 'closed' },
    })
    return NextResponse.json({ ...consultation, status: 'closed' })
  }

  return NextResponse.json(consultation)
}
```

- [ ] **Step 2: Update webhook to handle consultation payments**

Modify `src/app/api/webhook/mercadopago/route.ts`. Replace the block starting at `if (mpStatus.status === 'approved')`:

```typescript
  if (mpStatus.status === 'approved') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'approved' },
    })

    if (payment.consultationId) {
      // Consultation payment — activate the consultation (draw cards)
      await activateConsultation(payment.consultationId)
    } else {
      // Subscription payment
      await activateSubscription(payment.userId)
    }
  }
```

Also add the import at the top of the file:
```typescript
import { activateConsultation } from '@/lib/consultation'
```

The full updated file should look like:

```typescript
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { mpPayment } from '@/lib/mercadopago'
import { activateSubscription } from '@/lib/subscription'
import { activateConsultation } from '@/lib/consultation'

function validateSignature(req: Request, dataId: string): boolean {
  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET!

  const parts = Object.fromEntries(
    xSignature.split(';').map((p) => p.split('=') as [string, string])
  )
  const { ts, v1 } = parts
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  const vBuf = Buffer.from(v1, 'hex')
  const eBuf = Buffer.from(expected, 'hex')
  if (vBuf.length !== eBuf.length) return false
  return crypto.timingSafeEqual(vBuf, eBuf)
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') ?? ''

  if (!validateSignature(req, dataId)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payment = await prisma.payment.findUnique({
    where: { mpPaymentId: dataId },
  })

  if (!payment) {
    return NextResponse.json({ ok: true })
  }

  if (payment.status === 'approved') {
    return NextResponse.json({ ok: true })
  }

  const mpStatus = await mpPayment.get({ id: dataId })

  if (mpStatus.status === 'approved') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'approved' },
    })

    if (payment.consultationId) {
      await activateConsultation(payment.consultationId)
    } else {
      await activateSubscription(payment.userId)
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Run full test suite**

```bash
cd C:/tmp/tarot-mistico && npm test
```

Expected: all existing tests pass, no regressions.

- [ ] **Step 4: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/api/consultation/[id]/route.ts src/app/api/webhook/mercadopago/route.ts && git commit -m "feat: GET /api/consultation/[id] and webhook consultation activation"
```

---

## Task 7: POST /api/consultation/[id]/chat (Streaming)

**Files:**
- Create: `src/app/api/consultation/[id]/chat/route.ts`

> Note: This route uses real streaming via the Anthropic SDK — unit testing streaming is impractical. Instead, verify via tsc + manual smoke test after the UI is built.

- [ ] **Step 1: Implement the chat route**

Create `src/app/api/consultation/[id]/chat/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import anthropic from '@/lib/anthropic'
import { buildSystemPrompt, type TarotCard } from '@/lib/consultation'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!consultation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (consultation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (consultation.status !== 'active') {
    return NextResponse.json(
      { error: 'Consulta não está ativa' },
      { status: 400 }
    )
  }
  if (consultation.msgCount >= consultation.maxMsgs) {
    return NextResponse.json(
      { error: 'Limite de mensagens atingido' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { message } = body as { message: string }

  if (!message?.trim() || message.length > 500) {
    return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { consultationId: id, role: 'user', content: message.trim() },
  })

  const newMsgCount = consultation.msgCount + 1

  // Update count (and close if at limit)
  await prisma.consultation.update({
    where: { id },
    data: {
      msgCount: newMsgCount,
      ...(newMsgCount >= consultation.maxMsgs ? { status: 'closed' } : {}),
    },
  })

  const cards = consultation.cards as TarotCard[]
  const systemPrompt = buildSystemPrompt(
    consultation.type,
    cards,
    newMsgCount,
    consultation.maxMsgs
  )

  // Build messages for Claude (history + new user message)
  const history = consultation.messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
  const allMessages = [...history, { role: 'user' as const, content: message.trim() }]

  // Stream response
  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: systemPrompt,
    messages: allMessages,
  })

  let fullResponse = ''

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullResponse += text
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        // Save assistant message after stream completes
        await prisma.chatMessage.create({
          data: { consultationId: id, role: 'assistant', content: fullResponse },
        })
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        // On error, rollback msgCount so user doesn't lose their turn
        await prisma.consultation.update({
          where: { id },
          data: {
            msgCount: consultation.msgCount,
            status: consultation.status,
          },
        })
        controller.error(err)
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
cd C:/tmp/tarot-mistico && npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/api/consultation/[id]/chat/ && git commit -m "feat: POST /api/consultation/[id]/chat with Claude Haiku streaming"
```

---

## Task 8: /consulta/[id] Page — Chat UI

**Files:**
- Create: `src/app/consulta/[id]/page.tsx`
- Create: `src/app/consulta/[id]/ConsultationChat.tsx`

- [ ] **Step 1: Create server wrapper page**

Create `src/app/consulta/[id]/page.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { ConsultationChat } from './ConsultationChat'

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!consultation) notFound()
  if (consultation.userId !== session.user.id) notFound()

  if (consultation.status === 'pending_payment') {
    redirect(`/assinar?consultationId=${id}`)
  }

  return <ConsultationChat consultation={consultation as any} />
}
```

- [ ] **Step 2: Create ConsultationChat client component**

Create `src/app/consulta/[id]/ConsultationChat.tsx`:

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles, Send, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type TarotCard = {
  id: string
  name: string
  numeral: string
  symbol: string
  keywords: string[]
  uprightMeaning: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Consultation = {
  id: string
  type: string
  status: string
  cards: TarotCard[] | null
  msgCount: number
  maxMsgs: number
  messages: Message[]
}

const TYPE_LABELS: Record<string, string> = {
  familia: 'Família',
  trabalho: 'Trabalho',
  relacionamento: 'Relacionamento',
}

function CardChip({ card }: { card: TarotCard }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border border-arcane bg-abyss text-xs cursor-pointer hover:border-mystic transition-colors"
    >
      <span className="text-gold text-base leading-none">{card.symbol}</span>
      <span className="text-parchment font-display text-[10px] leading-tight">{card.name}</span>
      {expanded && (
        <span className="text-muted text-[9px] leading-tight mt-0.5 max-w-[80px] text-center">
          {card.keywords.slice(0, 2).join(' · ')}
        </span>
      )}
    </button>
  )
}

function MessageBubble({
  message,
  cards,
  isFirst,
}: {
  message: Message
  cards: TarotCard[] | null
  isFirst: boolean
}) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 font-body text-sm leading-relaxed ${
          isUser
            ? 'bg-mystic/30 border border-mystic/40 text-parchment rounded-tr-sm'
            : 'bg-abyss border border-arcane/60 text-parchment rounded-tl-sm'
        }`}
      >
        {!isUser && isFirst && cards && cards.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {cards.map((card) => (
              <CardChip key={card.id} card={card} />
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

export function ConsultationChat({ consultation }: { consultation: Consultation }) {
  const prefersReducedMotion = useReducedMotion()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(consultation.messages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [msgCount, setMsgCount] = useState(consultation.msgCount)
  const [closed, setClosed] = useState(consultation.status === 'closed')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const cards = consultation.cards as TarotCard[] | null
  const remaining = consultation.maxMsgs - msgCount

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [messages, streamText, prefersReducedMotion])

  async function sendMessage() {
    if (!input.trim() || streaming || closed || remaining <= 0) return

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamText('')

    try {
      const res = await fetch(`/api/consultation/${consultation.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'assistant', content: `Erro: ${err.error}` },
        ])
        setStreaming(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              setMessages((prev) => [
                ...prev,
                { id: `ai-${Date.now()}`, role: 'assistant', content: accumulated },
              ])
              setStreamText('')
              const newCount = msgCount + 1
              setMsgCount(newCount)
              if (newCount >= consultation.maxMsgs) setClosed(true)
            } else {
              try {
                const { text } = JSON.parse(data)
                accumulated += text
                setStreamText(accumulated)
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'Erro de conexão. Tente novamente.' },
      ])
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-b border-mystic/20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="font-display text-sm text-parchment tracking-widest">
              Tarot<span className="text-gold">Místico</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted text-xs font-body">
              {TYPE_LABELS[consultation.type]} ·{' '}
              <span className="text-parchment">
                {closed ? 'Encerrada' : `${remaining} msg${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}`}
              </span>
            </span>
            <Link
              href="/dashboard"
              className="text-muted hover:text-parchment transition-colors"
              title="Voltar ao dashboard"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Message counter dots — mobile */}
      <div className="fixed top-14 left-0 right-0 z-40 flex justify-center py-1 bg-void/80">
        <div className="flex gap-1">
          {Array.from({ length: consultation.maxMsgs }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < msgCount ? 'bg-gold' : 'bg-arcane'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pt-24 pb-28 overflow-y-auto">
        {messages.length === 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <p className="text-gold font-display text-lg mb-2">Madame Seraphina aguarda</p>
            <p className="text-muted font-body text-sm">
              Faça sua pergunta sobre {TYPE_LABELS[consultation.type].toLowerCase()}...
            </p>
          </motion.div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            cards={cards}
            isFirst={idx === 0 && msg.role === 'assistant'}
          />
        ))}

        {streaming && streamText && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-abyss border border-arcane/60 font-body text-sm text-parchment leading-relaxed">
              <p className="whitespace-pre-wrap">{streamText}</p>
              <span className="inline-block w-1 h-4 bg-gold animate-pulse ml-0.5" />
            </div>
          </div>
        )}

        {closed && !streaming && (
          <div className="text-center py-8">
            <p className="text-muted font-body text-sm mb-4">Consulta encerrada</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2 rounded-xl font-body text-sm bg-mystic/20 border border-mystic/40 text-parchment hover:bg-mystic/30 transition-colors"
            >
              Nova consulta
            </Link>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!closed && (
        <div className="fixed bottom-0 left-0 right-0 bg-void/95 border-t border-mystic/20 px-4 py-3">
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Faça sua pergunta a Madame Seraphina..."
              disabled={streaming || remaining <= 0}
              rows={1}
              className="flex-1 resize-none rounded-xl bg-abyss border border-arcane/60 text-parchment font-body text-sm px-4 py-2.5 placeholder-muted/60 focus:outline-none focus:border-mystic/60 disabled:opacity-40 max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || streaming || remaining <= 0}
              className="p-2.5 rounded-xl bg-mystic/80 hover:bg-mystic disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run build**

```bash
cd C:/tmp/tarot-mistico && npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/consulta/ && git commit -m "feat: /consulta/[id] chat page with streaming UI"
```

---

## Task 9: Dashboard Update — History + Consultation Buttons

**Files:**
- Modify: `src/app/dashboard/DashboardClient.tsx`

The dashboard needs two changes:
1. The "Iniciar uma Consulta" cards should call `POST /api/consultation/start` and redirect to the PIX QR flow, then to `/consulta/[id]`
2. The "Suas Consultas" section should fetch and display consultation history

- [ ] **Step 1: Update DashboardClient.tsx**

Read the full file first: `src/app/dashboard/DashboardClient.tsx`

Find the section where the consultation type buttons are rendered (the `CONSULTATIONS.map(...)` block). Replace whatever click handler exists (currently likely just a static display) with a real handler:

Add to component state:
```typescript
const [startingConsultation, setStartingConsultation] = useState<string | null>(null)
const [consultations, setConsultations] = useState<ConsultationSummary[]>([])
const [loadingHistory, setLoadingHistory] = useState(true)
```

Add type above component:
```typescript
type ConsultationSummary = {
  id: string
  type: string
  status: string
  msgCount: number
  maxMsgs: number
  createdAt: string
}
```

Add fetch for history in useEffect:
```typescript
useEffect(() => {
  fetch('/api/consultations')
    .then((r) => r.json())
    .then((data) => {
      if (Array.isArray(data)) setConsultations(data)
    })
    .catch(() => {})
    .finally(() => setLoadingHistory(false))
}, [])
```

Add start handler:
```typescript
const handleStartConsultation = async (type: string) => {
  setStartingConsultation(type)
  try {
    const res = await fetch('/api/consultation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    // Store QR data in sessionStorage (avoids URL length limits with long QR strings)
    sessionStorage.setItem(`consultation_qr_${data.consultationId}`, JSON.stringify({
      paymentId: data.payment_id,
      qrCode: data.qr_code,
      qrCodeBase64: data.qr_code_base64,
      expiresAt: data.expires_at,
    }))
    router.push(`/assinar?consultationId=${data.consultationId}`)
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'Erro ao iniciar consulta')
  } finally {
    setStartingConsultation(null)
  }
}
```

Add `import { useRouter } from 'next/navigation'` at the top if not already imported.

In the consultation cards JSX, replace any existing onClick or static state with:
```tsx
onClick={() => handleStartConsultation(c.id)}
disabled={startingConsultation === c.id}
```

In the "Suas Consultas" section, replace the empty state with:
```tsx
{loadingHistory ? (
  <p className="text-muted text-sm font-body animate-pulse">Carregando...</p>
) : consultations.length === 0 ? (
  <div className="flex flex-col items-center gap-2 py-6">
    <Sparkles className="w-8 h-8 text-gold/50" />
    <p className="text-muted text-sm font-body text-center">Nenhuma consulta ainda</p>
  </div>
) : (
  <div className="space-y-2">
    {consultations.map((c) => (
      <Link
        key={c.id}
        href={c.status === 'active' ? `/consulta/${c.id}` : '#'}
        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
          c.status === 'active'
            ? 'border-mystic/40 bg-mystic/10 hover:bg-mystic/20 cursor-pointer'
            : 'border-arcane/30 bg-abyss/50 cursor-default'
        }`}
      >
        <div>
          <p className="text-parchment text-xs font-body font-medium">
            {TYPE_LABELS[c.type]}
          </p>
          <p className="text-muted text-[10px] font-body">
            {new Date(c.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: c.maxMsgs }).map((_, i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full ${i < c.msgCount ? 'bg-gold' : 'bg-arcane/40'}`}
              />
            ))}
          </div>
          <span className={`text-[10px] font-body ${c.status === 'active' ? 'text-gold' : 'text-muted'}`}>
            {c.status === 'active' ? 'ativa' : 'encerrada'}
          </span>
        </div>
      </Link>
    ))}
  </div>
)}
```

Also add `const TYPE_LABELS: Record<string, string>` near the top of the component file (alongside CONSULTATIONS):
```typescript
const TYPE_LABELS: Record<string, string> = {
  familia: 'Família',
  trabalho: 'Trabalho',
  relacionamento: 'Relacionamento',
}
```

- [ ] **Step 2: Create GET /api/consultations route for history**

Create `src/app/api/consultations/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const consultations = await prisma.consultation.findMany({
    where: {
      userId: session.user.id,
      status: { in: ['active', 'closed'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      status: true,
      msgCount: true,
      maxMsgs: true,
      createdAt: true,
    },
  })

  return NextResponse.json(consultations)
}
```

- [ ] **Step 3: Run tsc**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite + build**

```bash
cd C:/tmp/tarot-mistico && npm test && npm run build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/dashboard/DashboardClient.tsx src/app/api/consultations/ && git commit -m "feat: dashboard consultation history and start flow"
```

---

## Task 10: Assinar Page — Handle Consultation PIX Flow

**Files:**
- Modify: `src/app/assinar/page.tsx`

The `/assinar` page needs to handle a new use case: when coming from a consultation start (has `consultationId` in query params), redirect to `/consulta/[id]` after payment approval instead of `/dashboard`.

- [ ] **Step 1: Update assinar page to handle consultation redirect**

Read `src/app/assinar/page.tsx` first.

The page uses `useRouter` to redirect after payment approval. Update the polling logic to check for `consultationId` in the URL query params and redirect accordingly.

Add near the top of the component:
```typescript
const searchParams = useSearchParams()
const consultationId = searchParams.get('consultationId')
```

Add `import { useSearchParams } from 'next/navigation'` if not present.

In the `pollStatus` callback, replace:
```typescript
router.push('/dashboard')
```
with:
```typescript
router.push(consultationId ? `/consulta/${consultationId}` : '/dashboard')
```

Also handle pre-filled QR code from query params (when coming from dashboard's consultation start):

In `useEffect`, check sessionStorage for QR data stored by the dashboard:
```typescript
useEffect(() => {
  const consultationId = searchParams.get('consultationId')
  if (!consultationId) return
  const raw = sessionStorage.getItem(`consultation_qr_${consultationId}`)
  if (!raw) return
  try {
    const { paymentId, qrCode, qrCodeBase64, expiresAt } = JSON.parse(raw)
    setState({ step: 'qr', paymentId, qrCode, qrCodeBase64, expiresAt })
    sessionStorage.removeItem(`consultation_qr_${consultationId}`)
  } catch {}
}, [searchParams]) // include searchParams in deps to satisfy exhaustive-deps lint rule
```

Wrap the component body with `<Suspense>` in the parent or add the suspense boundary needed for `useSearchParams` in Next.js 15.

- [ ] **Step 2: Run tsc + build**

```bash
cd C:/tmp/tarot-mistico && npx tsc --noEmit && npm run build
```

Expected: no errors, build succeeds.

- [ ] **Step 3: Run full test suite**

```bash
cd C:/tmp/tarot-mistico && npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd C:/tmp/tarot-mistico && git add src/app/assinar/page.tsx && git commit -m "feat: assinar page handles consultation PIX redirect"
```

---

## Done

After all tasks complete:

- Run `npm test && npm run build` one final time to confirm everything is clean
- Set `ANTHROPIC_API_KEY` in your `.env` file to test end-to-end
- Test the full flow: Dashboard → Família → PIX QR → (approve in sandbox) → chat opens → send 5 messages → consultation closes
