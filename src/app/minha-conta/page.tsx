import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditBadge } from '@/components/cliente/CreditBadge'
import { OrderCard } from '@/components/cliente/OrderCard'
import { Button } from '@/components/ui/button'

type Order = { id: string; type: string; status: string; total: number; notes: string | null; created_at: string }
type CreditTx = { id: string; amount: number; reason: string; created_at: string }

export default async function MinhaContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/minha-conta')

  const [
    { data: credits },
    { data: orders },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('customer_credits').select('balance').eq('customer_id', user.id).single() as unknown as Promise<{ data: { balance: number } | null }>,
    supabase.from('orders').select('id, type, status, total, notes, created_at').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(5) as unknown as Promise<{ data: Order[] | null }>,
    supabase.from('credit_transactions').select('id, amount, reason, created_at').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(5) as unknown as Promise<{ data: CreditTx[] | null }>,
  ])

  const balance = credits?.balance ?? 0

  const txReasonLabel: Record<string, string> = {
    purchase: 'Compra de pacote',
    order_deduction: 'Pedido realizado',
    order_refund: 'Estorno de pedido',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Minha Conta</h1>
        <CreditBadge balance={balance} />
      </div>

      <div className="flex flex-wrap gap-3">
        {balance > 0 && (
          <Link href="/">
            <Button>Pedir com crédito →</Button>
          </Link>
        )}
        <Link href="/">
          <Button variant="outline">Comprar créditos</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Pack congelado</Button>
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pedidos recentes</h2>
          <Link href="/minha-conta/pedidos" className="text-sm text-orange-600 hover:underline">Ver todos →</Link>
        </div>
        {(orders ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Você ainda não fez nenhum pedido.</p>
        ) : (
          <div className="space-y-2">
            {(orders ?? []).map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Movimentações de crédito</h2>
        {(transactions ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="bg-white rounded-lg border divide-y">
            {(transactions ?? []).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm text-gray-700">{txReasonLabel[tx.reason] ?? tx.reason}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} crédito{Math.abs(tx.amount) !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
