import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type CustomerRow = {
  id: string
  name: string
  phone: string | null
  customer_credits: { balance: number } | null
}

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('profiles')
    .select('id, name, phone, customer_credits(balance)')
    .eq('role', 'customer')
    .order('name') as unknown as { data: CustomerRow[] | null }

  const customerIds = (customers ?? []).map(c => c.id)
  const { data: orderStats } = await supabase
    .from('orders')
    .select('customer_id, created_at')
    .in('customer_id', customerIds.length ? customerIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false }) as unknown as {
      data: Array<{ customer_id: string; created_at: string }> | null
    }

  const statsByCustomer = (orderStats ?? []).reduce<
    Record<string, { count: number; lastOrder: string }>
  >((acc, row) => {
    if (!acc[row.customer_id]) {
      acc[row.customer_id] = { count: 0, lastOrder: row.created_at }
    }
    acc[row.customer_id].count++
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Clientes</h1>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Telefone</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Créditos</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Pedidos</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Último pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(customers ?? []).map(customer => {
              const stats = statsByCustomer[customer.id]
              return (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clientes/${customer.id}`}
                      className="font-medium text-orange-600 hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{customer.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium">{customer.customer_credits?.balance ?? 0}</span>{' '}
                    <span className="text-gray-400">créditos</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{stats?.count ?? 0}</td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {stats?.lastOrder
                      ? new Date(stats.lastOrder).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                </tr>
              )
            })}
            {!customers?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
