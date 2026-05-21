'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyRevenue } from '@/lib/relatorios'

function formatAxisDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function RevenueChart({ data }: { data: DailyRevenue[] }) {
  if (!data.length || data.every(d => d.revenue === 0)) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        Sem receita no período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={v => `R$${v}`}
          tick={{ fontSize: 12 }}
          width={60}
        />
        <Tooltip
          formatter={(value: any) => [formatCurrencyBRL(value as number), 'Receita']}
          labelFormatter={(label: any) => formatAxisDate(label as string)}
        />
        <Bar dataKey="revenue" fill="#ea580c" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
