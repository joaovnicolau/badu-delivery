import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrderCard } from '@/components/cliente/OrderCard'

type Order = { id: string; type: string; status: string; total: number; notes: string | null; created_at: string }

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/minha-conta/pedidos')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, type, status, total, notes, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false }) as unknown as { data: Order[] | null }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meus Pedidos</h1>
      {(orders ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">Você ainda não fez nenhum pedido.</p>
      ) : (
        <div className="space-y-3">
          {(orders ?? []).map(o => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  )
}
