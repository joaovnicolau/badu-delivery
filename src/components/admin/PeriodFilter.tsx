'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

function getSpToday(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
}

function getSpWeekStart(): string {
  const spDateStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
  const date = new Date(spDateStr + 'T12:00:00Z')
  const dow = date.getUTCDay() // 0=domingo
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() - ((dow + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

function getSpMonthStart(offset: number): string {
  const spDateStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
  const [year, month] = spDateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1 + offset, 1))
  return d.toISOString().slice(0, 10)
}

function getSpMonthEnd(offset: number): string {
  const spDateStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
  const [year, month] = spDateStr.split('-').map(Number)
  // Dia 0 do próximo mês = último dia do mês alvo
  const d = new Date(Date.UTC(year, month + offset, 0))
  return d.toISOString().slice(0, 10)
}

type QuickFilter = 'today' | 'week' | 'month' | 'lastmonth'

export function PeriodFilter({ de, ate }: { de: string; ate: string }) {
  const router = useRouter()
  const [fromVal, setFromVal] = useState(de)
  const [toVal, setToVal] = useState(ate)

  function navigate(from: string, to: string) {
    router.push(`/admin/relatorios?de=${from}&ate=${to}`)
  }

  const today = getSpToday()
  const weekStart = getSpWeekStart()
  const monthStart = getSpMonthStart(0)
  const lastMonthStart = getSpMonthStart(-1)
  const lastMonthEnd = getSpMonthEnd(-1)

  function getActiveFilter(): QuickFilter | null {
    if (de === today && ate === today) return 'today'
    if (de === weekStart && ate === today) return 'week'
    if (de === monthStart && ate === today) return 'month'
    if (de === lastMonthStart && ate === lastMonthEnd) return 'lastmonth'
    return null
  }

  const active = getActiveFilter()

  const quickFilters: Array<{ key: QuickFilter; label: string; from: string; to: string }> = [
    { key: 'today', label: 'Hoje', from: today, to: today },
    { key: 'week', label: 'Esta semana', from: weekStart, to: today },
    { key: 'month', label: 'Este mês', from: monthStart, to: today },
    { key: 'lastmonth', label: 'Mês passado', from: lastMonthStart, to: lastMonthEnd },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border p-4">
      <div className="flex flex-wrap gap-2">
        {quickFilters.map(f => (
          <button
            key={f.key}
            onClick={() => navigate(f.from, f.to)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              active === f.key
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 ml-auto flex-wrap">
        <input
          type="date"
          value={fromVal}
          onChange={e => setFromVal(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <span className="text-gray-400 text-sm">até</span>
        <input
          type="date"
          value={toVal}
          onChange={e => setToVal(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <Button size="sm" onClick={() => navigate(fromVal, toVal)}>
          Aplicar
        </Button>
      </div>
    </div>
  )
}
