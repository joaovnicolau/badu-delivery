import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/lib/evolution'

describe('renderTemplate', () => {
  it('substitui variável simples', () => {
    expect(renderTemplate('Olá {{nome}}!', { nome: 'João' })).toBe('Olá João!')
  })

  it('substitui múltiplas variáveis diferentes', () => {
    expect(renderTemplate('{{nome}} pediu {{itens}}', { nome: 'Ana', itens: 'Marmita Fit' }))
      .toBe('Ana pediu Marmita Fit')
  })

  it('substitui mesma variável múltiplas vezes', () => {
    expect(renderTemplate('{{nome}}, olá {{nome}}!', { nome: 'Bob' })).toBe('Bob, olá Bob!')
  })

  it('mantém texto sem variáveis', () => {
    expect(renderTemplate('Pedido confirmado.', {})).toBe('Pedido confirmado.')
  })

  it('ignora variáveis ausentes no mapa', () => {
    expect(renderTemplate('Olá {{nome}} {{sobrenome}}', { nome: 'João' }))
      .toBe('Olá João {{sobrenome}}')
  })
})
