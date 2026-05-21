import { createClient } from '@/lib/supabase/server'
import { OrdersRealtime } from '@/components/admin/OrdersRealtime'

export type OrderFull = {
  id: string
  type: string
  status: string
  print_status: string
  total: number
  notes: string | null
  delivery_address: string | null
  created_at: string
  accepted_at: string | null
  dispatched_at: string | null
  // customer_credits é joined via profiles (profiles.id ← customer_credits.customer_id)
  profiles: {
    name: string
    phone: string | null
    customer_credits: { balance: number } | null
  } | null
  order_items: Array<{
    quantity: number
    unit_price: number
    products: { name: string } | null
  }>
}

export default async function PedidosAdminPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, type, status, print_status, total, notes,
      delivery_address, created_at, accepted_at, dispatched_at,
      profiles(name, phone, customer_credits(balance)),
      order_items(quantity, unit_price, products(name))
    `)
    .order('created_at', { ascending: false })
    .limit(100) as unknown as { data: OrderFull[] | null }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestão de Pedidos</h1>
      <OrdersRealtime initialOrders={orders ?? []} />
    </div>
  )
}
