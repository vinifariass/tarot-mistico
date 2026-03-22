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
