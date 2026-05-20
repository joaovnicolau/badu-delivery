import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: 'Aguardando',  variant: 'secondary'    },
  accepted:   { label: 'Aceito',      variant: 'default'      },
  rejected:   { label: 'Recusado',    variant: 'destructive'  },
  dispatched: { label: 'Despachado',  variant: 'outline'      },
}

const TYPE: Record<string, string> = {
  single:       'Avulso',
  fresh_credit: 'Com crédito',
  frozen_pack:  'Pack congelado',
}

type Order = {
  id: string
  type: string
  status: string
  total: number
  notes: string | null
  created_at: string
}

export function OrderCard({ order }: { order: Order }) {
  const status = STATUS[order.status] ?? { label: order.status, variant: 'secondary' as const }
  const date = new Date(order.created_at).toLocaleDateString('pt-BR')

  return (
    <div className="bg-white rounded-lg border p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium text-gray-700">{TYPE[order.type] ?? order.type}</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-xs text-gray-400">{date}</p>
        {order.notes && <p className="text-xs text-gray-500 mt-1 truncate">{order.notes}</p>}
      </div>
      <div className="text-right shrink-0">
        {order.total > 0 ? (
          <p className="font-semibold text-gray-700">{formatCurrency(order.total)}</p>
        ) : order.type === 'fresh_credit' ? (
          <p className="text-sm text-orange-600 font-medium">1 crédito</p>
        ) : null}
      </div>
    </div>
  )
}
