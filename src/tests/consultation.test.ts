import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    consultation: {
      update: vi.fn(),
      findUnique: vi.fn(),
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
    expect(new Set(ids).size).toBe(3)
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
