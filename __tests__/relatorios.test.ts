import { describe, it, expect } from 'vitest'
import { fillDailyRevenue, groupByWeek, shouldGroupByWeek, parsePeriod } from '@/lib/relatorios'

describe('fillDailyRevenue', () => {
  it('preenche dias sem receita com zero', () => {
    const deDate = new Date('2026-05-01T00:00:00-03:00')
    const ateDate = new Date('2026-05-03T23:59:59-03:00')
    const payments = [{ created_at: '2026-05-02T10:00:00-03:00', amount: 100 }]
    const result = fillDailyRevenue(payments, deDate, ateDate)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ date: '2026-05-01', revenue: 0 })
    expect(result[1]).toEqual({ date: '2026-05-02', revenue: 100 })
    expect(result[2]).toEqual({ date: '2026-05-03', revenue: 0 })
  })

  it('soma múltiplos pagamentos no mesmo dia', () => {
    const deDate = new Date('2026-05-01T00:00:00-03:00')
    const ateDate = new Date('2026-05-01T23:59:59-03:00')
    const payments = [
      { created_at: '2026-05-01T09:00:00-03:00', amount: 50 },
      { created_at: '2026-05-01T15:00:00-03:00', amount: 75 },
    ]
    const result = fillDailyRevenue(payments, deDate, ateDate)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ date: '2026-05-01', revenue: 125 })
  })

  it('retorna array vazio para período sem dias', () => {
    const deDate = new Date('2026-05-05T00:00:00-03:00')
    const ateDate = new Date('2026-05-04T23:59:59-03:00') // ate < de
    const result = fillDailyRevenue([], deDate, ateDate)
    expect(result).toHaveLength(0)
  })
})

describe('shouldGroupByWeek', () => {
  it('retorna false para período de 60 dias', () => {
    expect(shouldGroupByWeek('2026-05-01', '2026-06-30')).toBe(false)
  })

  it('retorna true para período maior que 60 dias', () => {
    expect(shouldGroupByWeek('2026-01-01', '2026-05-01')).toBe(true)
  })
})

describe('groupByWeek', () => {
  it('agrupa dias em semanas somando receita', () => {
    const days = [
      { date: '2026-05-04', revenue: 100 }, // segunda
      { date: '2026-05-05', revenue: 200 }, // terça (mesma semana)
      { date: '2026-05-11', revenue: 50 },  // próxima segunda
    ]
    const result = groupByWeek(days)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: '2026-05-04', revenue: 300 })
    expect(result[1]).toEqual({ date: '2026-05-11', revenue: 50 })
  })

  it('retorna array vazio para entrada vazia', () => {
    expect(groupByWeek([])).toHaveLength(0)
  })
})

describe('parsePeriod', () => {
  it('retorna valores fornecidos quando presentes', () => {
    const result = parsePeriod('2026-04-01', '2026-04-30')
    expect(result.de).toBe('2026-04-01')
    expect(result.ate).toBe('2026-04-30')
    expect(result.deDate).toBeInstanceOf(Date)
    expect(result.ateDate).toBeInstanceOf(Date)
  })

  it('retorna mês atual quando ausente', () => {
    const result = parsePeriod(undefined, undefined)
    const spDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
    expect(result.de).toMatch(/^\d{4}-\d{2}-01$/) // primeiro dia do mês
    expect(result.ate).toBe(spDate) // hoje
  })
})
