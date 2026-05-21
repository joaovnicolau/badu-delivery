import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { createReminder, completeReminder } from '../actions'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

const ORDER_TYPE_LABEL: Record<string, string> = {
  single: 'Avulso',
  fresh_credit: 'Com crédito',
  frozen_pack: 'Pack congelado',
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  accepted: 'Aceito',
  rejected: 'Recusado',
  dispatched: 'Despachado',
}

type OrderRow = {
  id: string
  type: string
  status: string
  total: number
  created_at: string
  order_items: Array<{ products: { name: string } | null }>
}

type Reminder = {
  id: string
  note: string
  remind_at: string
  done: boolean
}

type Profile = {
  id: string
  name: string
  phone: string | null
  address: string | null
  customer_credits: { balance: number } | null
}

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { id } = params

  const [
    { data: profile },
    { data: openOrders },
    { data: allOrders },
    { data: reminders },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, phone, address, customer_credits(balance)')
      .eq('id', id)
      .single() as unknown as Promise<{ data: Profile | null }>,
    supabase
      .from('orders')
      .select('id, type, status, total, created_at, order_items(products(name))')
      .eq('customer_id', id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false }) as unknown as Promise<{
        data: OrderRow[] | null
      }>,
    supabase
      .from('orders')
      .select('id, type, status, total, created_at, order_items(products(name))')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(20) as unknown as Promise<{ data: OrderRow[] | null }>,
    supabase
      .from('reminders')
      .select('id, note, remind_at, done')
      .eq('customer_id', id)
      .order('done', { ascending: true })
      .order('remind_at', { ascending: true }) as unknown as Promise<{
        data: Reminder[] | null
      }>,
  ])

  if (!profile) notFound()

  const balance = profile.customer_credits?.balance ?? 0

  return (
    <div className="max-w-3xl space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
        <div className="mt-2 text-sm text-gray-600 space-y-1">
          {profile.phone && <p>📞 {profile.phone}</p>}
          {profile.address && <p>📍 {profile.address}</p>}
          <p className="font-medium text-orange-600">
            {balance} crédito{balance !== 1 ? 's' : ''} disponível{balance !== 1 ? 'is' : ''}
          </p>
        </div>
      </div>

      {/* Pedidos em aberto */}
      {(openOrders?.length ?? 0) > 0 && (
        <section className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-orange-800 mb-3">
            Pedidos em aberto ({openOrders!.length})
          </h2>
          <div className="space-y-3">
            {openOrders!.map(order => {
              const items = order.order_items
                .map(i => i.products?.name)
                .filter(Boolean)
              return (
                <div key={order.id} className="bg-white rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {ORDER_TYPE_LABEL[order.type] ?? order.type}
                    </span>
                    <span className="text-orange-600 font-medium">
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  {items.length > 0 && (
                    <p className="text-gray-500 mt-1">{items.join(', ')}</p>
                  )}
                  <div className="flex justify-between mt-1 text-gray-400">
                    <span>
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {order.total > 0 && <span>{formatCurrency(order.total)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Histórico completo */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Histórico de pedidos</h2>
        {!allOrders?.length ? (
          <p className="text-gray-400 text-sm">Nenhum pedido ainda.</p>
        ) : (
          <div className="bg-white rounded-xl border divide-y">
            {allOrders.map(order => {
              const items = order.order_items
                .map(i => i.products?.name)
                .filter(Boolean)
              return (
                <div
                  key={order.id}
                  className="px-4 py-3 text-sm flex items-start justify-between gap-4"
                >
                  <div>
                    <span className="font-medium">
                      {ORDER_TYPE_LABEL[order.type] ?? order.type}
                    </span>
                    {items.length > 0 && (
                      <p className="text-gray-500 text-xs mt-0.5">{items.join(', ')}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-gray-600">{ORDER_STATUS_LABEL[order.status]}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    {order.total > 0 && (
                      <p className="text-xs font-medium">{formatCurrency(order.total)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Lembretes */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Lembretes</h2>

        {(reminders?.length ?? 0) > 0 && (
          <div className="space-y-2 mb-4">
            {reminders!.map(reminder => (
              <div
                key={reminder.id}
                className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${
                  reminder.done ? 'bg-gray-50 opacity-60' : 'bg-white'
                }`}
              >
                <div>
                  <p
                    className={`text-sm ${
                      reminder.done ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {reminder.note}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(reminder.remind_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!reminder.done && (
                  <form
                    action={async () => {
                      'use server'
                      await completeReminder(reminder.id, id)
                    }}
                  >
                    <Button type="submit" size="sm" variant="outline">
                      Feito
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulário novo lembrete */}
        <form
          action={async (fd) => {
            'use server'
            await createReminder(id, fd)
          }}
          className="bg-white rounded-xl border p-4 space-y-3"
        >
          <p className="text-sm font-medium text-gray-700">Novo lembrete</p>
          <textarea
            name="note"
            required
            rows={2}
            placeholder="Ex: Ligar para oferecer pacote mensal"
            className="w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="datetime-local"
              name="remind_at"
              required
              className="text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <Button type="submit" size="sm">Criar lembrete</Button>
          </div>
        </form>
      </section>
    </div>
  )
}
