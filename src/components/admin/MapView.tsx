'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import type { MapOrderPin } from '@/app/admin/mapa/page'

const createPinIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  })

const ICON_ACCEPTED = createPinIcon('#ea580c')
const ICON_DISPATCHED = createPinIcon('#16a34a')

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Aceito',
  dispatched: 'Despachado',
}

export default function MapView({
  initialOrders,
  todayStart,
}: {
  initialOrders: MapOrderPin[]
  todayStart: string
}) {
  const [orders, setOrders] = useState<MapOrderPin[]>(initialOrders)

  const withCoords = orders.filter(o => o.delivery_lat && o.delivery_lng)
  const withoutCoords = orders.filter(o => !o.delivery_lat || !o.delivery_lng)

  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].delivery_lat!, withCoords[0].delivery_lng!]
      : [-19.75, -47.93]

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('mapa-orders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          const updated = payload.new as Record<string, unknown>
          const status = updated.status as string
          const acceptedAt = updated.accepted_at as string | null

          if (
            !['accepted', 'dispatched'].includes(status) ||
            !acceptedAt ||
            acceptedAt < todayStart
          ) {
            setOrders(prev => prev.filter(o => o.id !== (updated.id as string)))
            return
          }

          const { data } = await supabase
            .from('orders')
            .select('id, status, delivery_lat, delivery_lng, delivery_address, accepted_at, profiles(name)')
            .eq('id', updated.id as string)
            .single() as unknown as { data: MapOrderPin | null }

          if (!data) return

          setOrders(prev => {
            const exists = prev.some(o => o.id === data.id)
            if (exists) return prev.map(o => (o.id === data.id ? data : o))
            return [...prev, data]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [todayStart])

  return (
    <div className="space-y-4">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '500px', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map(order => (
          <Marker
            key={order.id}
            position={[order.delivery_lat!, order.delivery_lng!]}
            icon={order.status === 'accepted' ? ICON_ACCEPTED : ICON_DISPATCHED}
          >
            <Popup>
              <div className="text-sm space-y-1 min-w-[140px]">
                <p className="font-semibold">{order.profiles?.name ?? 'Cliente'}</p>
                {order.delivery_address && (
                  <p className="text-gray-600 text-xs">{order.delivery_address}</p>
                )}
                <p className={order.status === 'accepted' ? 'text-orange-600' : 'text-green-600'}>
                  {STATUS_LABEL[order.status]}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-600" />
          <span>Aceito</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-600" />
          <span>Despachado</span>
        </div>
        <span className="ml-auto text-gray-400">
          {withCoords.length} pin{withCoords.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Pedidos sem coordenadas */}
      {withoutCoords.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm font-medium text-amber-800 mb-2">
            Pedidos sem localização no mapa:
          </p>
          <ul className="space-y-1">
            {withoutCoords.map(order => (
              <li key={order.id} className="text-sm text-amber-700">
                {order.profiles?.name ?? 'Cliente'} — {order.delivery_address ?? 'sem endereço'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
