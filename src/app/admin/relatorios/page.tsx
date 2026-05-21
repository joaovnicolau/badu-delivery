import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  parsePeriod,
  fillDailyRevenue,
  groupByWeek,
  shouldGroupByWeek,
} from '@/lib/relatorios'
import { PeriodFilter } from '@/components/admin/PeriodFilter'
import { formatCurrency } from '@/lib/utils'

const RevenueChart = dynamic(() => import('@/components/admin/RevenueChart'), {
  ssr: false,
})

const ORDER_TYPE_LABEL: Record<string, string> = {
  single: 'Avulso',
  fresh_credit: 'Com crédito',
  frozen_pack: 'Pack congelado',
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { de?: string; ate?: string }
}) {
  const { de, ate, deDate, ateDate } = parsePeriod(searchParams.de, searchParams.ate)
  const supabase = await createClient()

  const [
    { data: payments },
    { data: orders },
    { data: creditTx },
    { data: allCredits },
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, created_at, customer_id')
      .eq('status', 'paid')
      .gte('created_at', deDate.toISOString())
      .lte('created_at', ateDate.toISOString()) as unknown as Promise<{
        data: Array<{ amount: number; created_at: string; customer_id: string }> | null
      }>,
    supabase
      .from('orders')
      .select('id, type, status, total, customer_id, created_at')
      .gte('created_at', deDate.toISOString())
      .lte('created_at', ateDate.toISOString()) as unknown as Promise<{
        data: Array<{
          id: string
          type: string
          status: string
          total: number
          customer_id: string
          created_at: string
        }> | null
      }>,
    supabase
      .from('credit_transactions')
      .select('customer_id, amount, reason')
      .gte('created_at', deDate.toISOString())
      .lte('created_at', ateDate.toISOString()) as unknown as Promise<{
        data: Array<{ customer_id: string; amount: number; reason: string }> | null
      }>,
    supabase
      .from('customer_credits')
      .select('balance') as unknown as Promise<{
        data: Array<{ balance: number }> | null
      }>,
  ])

  // ---- Cards de resumo ----
  const totalRevenue = (payments ?? []).reduce((s, p) => s + p.amount, 0)

  const ordersAll = orders ?? []
  const ordersFinalized = ordersAll.filter(o =>
    ['accepted', 'dispatched', 'rejected'].includes(o.status)
  )
  const ordersAccepted = ordersAll.filter(o =>
    ['accepted', 'dispatched'].includes(o.status)
  )
  const acceptanceRate =
    ordersFinalized.length
      ? Math.round((ordersAccepted.length / ordersFinalized.length) * 100)
      : null

  const txAll = creditTx ?? []
  const creditsPurchased = txAll
    .filter(t => t.reason === 'purchase')
    .reduce((s, t) => s + t.amount, 0)

  // ---- Gráfico ----
  const dailyRevenue = fillDailyRevenue(payments ?? [], deDate, ateDate)
  const chartData = shouldGroupByWeek(de, ate)
    ? groupByWeek(dailyRevenue)
    : dailyRevenue

  // ---- Pedidos por tipo ----
  const typeStats = (['single', 'fresh_credit', 'frozen_pack'] as const).map(type => {
    const typeOrders = ordersAll.filter(
      o => o.type === type && o.status !== 'rejected'
    )
    return {
      type,
      count: typeOrders.length,
      total: type !== 'fresh_credit'
        ? typeOrders.reduce((s, o) => s + o.total, 0)
        : null,
    }
  })

  // ---- Pedidos por status ----
  const statusStats = {
    accepted: ordersAccepted.length,
    rejected: ordersAll.filter(o => o.status === 'rejected').length,
    pending: ordersAll.filter(o => o.status === 'pending').length,
    total: ordersFinalized.length,
  }

  // ---- Créditos ----
  const creditsUsed = txAll
    .filter(t => t.reason === 'order_deduction')
    .reduce((s, t) => s + t.amount, 0)
  const totalBalance = (allCredits ?? []).reduce((s, c) => s + c.balance, 0)

  // ---- Ranking de clientes (query sequencial após saber os IDs) ----
  const customerRevenue = new Map<string, number>()
  for (const p of payments ?? []) {
    customerRevenue.set(p.customer_id, (customerRevenue.get(p.customer_id) ?? 0) + p.amount)
  }
  const customerOrders = new Map<string, number>()
  for (const o of ordersAccepted) {
    customerOrders.set(o.customer_id, (customerOrders.get(o.customer_id) ?? 0) + 1)
  }
  const customerCreditsUsed = new Map<string, number>()
  for (const t of txAll.filter(t => t.reason === 'order_deduction')) {
    customerCreditsUsed.set(t.customer_id, (customerCreditsUsed.get(t.customer_id) ?? 0) + t.amount)
  }

  const allCustomerIds = Array.from(
    new Set([
      ...Array.from(customerRevenue.keys()),
      ...Array.from(customerOrders.keys()),
    ])
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in(
      'id',
      allCustomerIds.length
        ? allCustomerIds
        : ['00000000-0000-0000-0000-000000000000']
    ) as unknown as { data: Array<{ id: string; name: string }> | null }

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.name]))

  const ranking = allCustomerIds
    .map(id => ({
      id,
      name: profileMap.get(id) ?? 'Cliente',
      orders: customerOrders.get(id) ?? 0,
      revenue: customerRevenue.get(id) ?? 0,
      creditsUsed: customerCreditsUsed.get(id) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Relatórios</h1>
        <p className="text-sm text-gray-500">
          {de} até {ate}
        </p>
      </div>

      {/* Filtros */}
      <PeriodFilter de={de} ate={ate} />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Receita total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">pagamentos confirmados</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pedidos realizados</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ordersAccepted.length}</p>
          <p className="text-xs text-gray-400 mt-1">aceitos + despachados</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Taxa de aceitação</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {acceptanceRate !== null ? `${acceptanceRate}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {ordersAccepted.length} de {ordersFinalized.length} finalizados
          </p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Créditos vendidos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{creditsPurchased}</p>
          <p className="text-xs text-gray-400 mt-1">no período</p>
        </div>
      </div>

      {/* Gráfico de receita */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Receita {shouldGroupByWeek(de, ate) ? 'por semana' : 'por dia'}
        </h2>
        <RevenueChart data={chartData} />
      </div>

      {/* Pedidos por tipo e status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Por tipo</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b">
                <th className="pb-2">Tipo</th>
                <th className="pb-2 text-right">Qtd</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {typeStats.map(s => (
                <tr key={s.type}>
                  <td className="py-2 text-gray-700">{ORDER_TYPE_LABEL[s.type]}</td>
                  <td className="py-2 text-right text-gray-600">{s.count}</td>
                  <td className="py-2 text-right text-gray-600">
                    {s.total !== null ? formatCurrency(s.total) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Por status</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b">
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Qtd</th>
                <th className="pb-2 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 text-gray-700">Aceito / Despachado</td>
                <td className="py-2 text-right text-gray-600">{statusStats.accepted}</td>
                <td className="py-2 text-right text-gray-600">
                  {statusStats.total
                    ? `${Math.round((statusStats.accepted / statusStats.total) * 100)}%`
                    : '—'}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-700">Recusado</td>
                <td className="py-2 text-right text-gray-600">{statusStats.rejected}</td>
                <td className="py-2 text-right text-gray-600">
                  {statusStats.total
                    ? `${Math.round((statusStats.rejected / statusStats.total) * 100)}%`
                    : '—'}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-700">Aguardando</td>
                <td className="py-2 text-right text-gray-600">{statusStats.pending}</td>
                <td className="py-2 text-right text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Créditos */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Créditos</h2>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-gray-500">Vendidos no período</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{creditsPurchased}</p>
          </div>
          <div>
            <p className="text-gray-500">Usados no período</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{creditsUsed}</p>
          </div>
          <div>
            <p className="text-gray-500">Saldo em aberto (atual)</p>
            <p className="text-xl font-bold text-orange-600 mt-1">{totalBalance}</p>
          </div>
        </div>
      </div>

      {/* Ranking de clientes */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Top clientes no período</h2>
        {!ranking.length ? (
          <p className="text-gray-400 text-sm">Nenhum cliente com pedidos no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b">
                <th className="pb-2">Cliente</th>
                <th className="pb-2 text-right">Pedidos</th>
                <th className="pb-2 text-right">Gasto (Pix)</th>
                <th className="pb-2 text-right">Créditos usados</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ranking.map(r => (
                <tr key={r.id}>
                  <td className="py-2">
                    <Link
                      href={`/admin/clientes/${r.id}`}
                      className="text-orange-600 hover:underline font-medium"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 text-right text-gray-600">{r.orders}</td>
                  <td className="py-2 text-right text-gray-600">
                    {r.revenue > 0 ? formatCurrency(r.revenue) : '—'}
                  </td>
                  <td className="py-2 text-right text-gray-600">
                    {r.creditsUsed > 0 ? r.creditsUsed : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
