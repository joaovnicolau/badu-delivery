import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/admin/MapView'), { ssr: false })

export type MapOrderPin = {
  id: string
  status: 'accepted' | 'dispatched'
  delivery_lat: number | null
  delivery_lng: number | null
  delivery_address: string | null
  accepted_at: string
  profiles: { name: string } | null
}

export default async function MapaPage() {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, delivery_lat, delivery_lng, delivery_address, accepted_at, profiles(name)')
    .in('status', ['accepted', 'dispatched'])
    .gte('accepted_at', todayStart.toISOString())
    .not('delivery_lat', 'is', null) as unknown as { data: MapOrderPin[] | null }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Mapa de Entregas</h1>
      <p className="text-sm text-gray-500">Pedidos aceitos e despachados hoje.</p>
      <MapView
        initialOrders={orders ?? []}
        todayStart={todayStart.toISOString()}
      />
    </div>
  )
}
