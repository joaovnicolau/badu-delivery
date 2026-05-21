export type DailyRevenue = { date: string; revenue: number }

export function parsePeriod(
  de: string | undefined,
  ate: string | undefined
): { de: string; ate: string; deDate: Date; ateDate: Date } {
  const spToday = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
  const [year, month] = spToday.split('-')
  const defaultDe = `${year}-${month}-01`

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
  const deStr = (de && ISO_DATE.test(de)) ? de : defaultDe
  const ateStr = (ate && ISO_DATE.test(ate)) ? ate : spToday

  const deDate = new Date(`${deStr}T00:00:00-03:00`)
  const ateDate = new Date(`${ateStr}T23:59:59.999-03:00`)

  // Fall back to defaults if the date is invalid (e.g. 2026-13-99 passes the regex but fails Date parsing)
  const safeDe = isNaN(deDate.getTime()) ? new Date(`${defaultDe}T00:00:00-03:00`) : deDate
  const safeAte = isNaN(ateDate.getTime()) ? new Date(`${spToday}T23:59:59.999-03:00`) : ateDate

  return {
    de: isNaN(deDate.getTime()) ? defaultDe : deStr,
    ate: isNaN(ateDate.getTime()) ? spToday : ateStr,
    deDate: safeDe,
    ateDate: safeAte,
  }
}

export function fillDailyRevenue(
  payments: Array<{ created_at: string; amount: number }>,
  deDate: Date,
  ateDate: Date
): DailyRevenue[] {
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const revenueMap = new Map<string, number>()

  for (const p of payments) {
    const date = fmt.format(new Date(p.created_at))
    revenueMap.set(date, (revenueMap.get(date) ?? 0) + p.amount)
  }

  const days: DailyRevenue[] = []
  const cursor = new Date(deDate)
  while (cursor <= ateDate) {
    const dateStr = fmt.format(cursor)
    days.push({ date: dateStr, revenue: revenueMap.get(dateStr) ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

export function shouldGroupByWeek(de: string, ate: string): boolean {
  const diff = new Date(ate).getTime() - new Date(de).getTime()
  return diff > 60 * 24 * 60 * 60 * 1000
}

export function groupByWeek(days: DailyRevenue[]): DailyRevenue[] {
  const weekMap = new Map<string, number>()

  for (const d of days) {
    const date = new Date(d.date + 'T12:00:00Z')
    const dow = date.getUTCDay() // 0=domingo
    const monday = new Date(date)
    monday.setUTCDate(date.getUTCDate() - ((dow + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    weekMap.set(key, (weekMap.get(key) ?? 0) + d.revenue)
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }))
}
