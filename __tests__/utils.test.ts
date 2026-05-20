import { describe, it, expect } from 'vitest'
import { slugify, formatCurrency } from '@/lib/utils'

describe('slugify', () => {
  it('converte texto simples em slug', () => {
    expect(slugify('Frango Grelhado')).toBe('frango-grelhado')
  })
  it('remove acentos', () => {
    expect(slugify('Marmita Fit Proteína')).toBe('marmita-fit-proteina')
  })
  it('substitui espaços múltiplos por um hífen', () => {
    expect(slugify('Marmita   Fit')).toBe('marmita-fit')
  })
  it('remove caracteres especiais', () => {
    expect(slugify('Arroz & Feijão!')).toBe('arroz-feijao')
  })
})

describe('formatCurrency', () => {
  it('formata número como real brasileiro', () => {
    expect(formatCurrency(29.9)).toBe('R$\xa029,90')
  })
  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('R$\xa00,00')
  })
})
