'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderRow } from './OrderRow'
import type { OrderFull } from '@/app/admin/pedidos/page'

const STATUS_FILTERS = ['todos', 'pending', 'accepted', 'dispatched', 'rejected'] as const
type Filter = (typeof STATUS_FILTERS)[number]

const FILTER_LABEL: Record<Filter, string> = {
  todos:      'Todos',
  pending:    'Aguardando',
  accepted:   'Aceitos',
  dispatched: 'Despachados',
  rejected:   'Recusados',
}

export function OrdersRealtime({ initialOrders }: { initialOrders: OrderFull[] }) {
  const [orders, setOrders] = useState<OrderFull[]>(initialOrders)
  const [filter, setFilter] = useState<Filter>('todos')

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders(prev =>
            prev.map(o =>
              o.id === payload.new.id
                ? { ...o, ...(payload.new as Partial<OrderFull>) }
                : o
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          // Realtime só traz o row simples — re-buscar com joins completos
          const { data } = await supabase
            .from('orders')
            .select(`
              id, type, status, print_status, total, notes,
              delivery_address, created_at, accepted_at, dispatched_at,
              profiles(name, phone, customer_credits(balance)),
              order_items(quantity, unit_price, products(name))
            `)
            .eq('id', payload.new.id)
            .single() as unknown as { data: OrderFull | null }

          if (data) {
            setOrders(prev =>
              prev.some(o => o.id === data.id) ? prev : [data, ...prev]
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered =
    filter === 'todos' ? orders : orders.filter(o => o.status === filter)

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {FILTER_LABEL[f]}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          {filter === 'pending' ? 'Nenhum pedido aguardando.' : 'Nenhum pedido encontrado.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
