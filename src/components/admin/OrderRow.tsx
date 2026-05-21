'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { acceptOrder, rejectOrder, dispatchOrder, updatePrintStatus } from '@/app/admin/pedidos/actions'
import { printLabel, type LabelData } from '@/lib/qztray'
import type { OrderFull } from '@/app/admin/pedidos/page'

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: 'Aguardando',  variant: 'secondary'   },
  accepted:   { label: 'Aceito',      variant: 'default'     },
  rejected:   { label: 'Recusado',    variant: 'destructive' },
  dispatched: { label: 'Despachado',  variant: 'outline'     },
}

const TYPE_LABEL: Record<string, string> = {
  single:       'Avulso',
  fresh_credit: 'Com crédito',
  frozen_pack:  'Pack congelado',
}

const PRINT_STATUS_LABEL: Record<string, string> = {
  pending: '',
  printed: '✓ Impresso',
  failed:  '⚠ Falha na impressão',
}

export function OrderRow({ order }: { order: OrderFull }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const status = STATUS_LABEL[order.status] ?? { label: order.status, variant: 'secondary' as const }
  const date = new Date(order.created_at).toLocaleString('pt-BR')
  const itemNames = order.order_items.map(i => i.products?.name ?? '').filter(Boolean)
  const customerName = order.profiles?.name ?? 'Cliente'
  const credits = order.profiles?.customer_credits?.balance ?? 0

  async function handleAccept() {
    setLoading('accept')
    setError('')
    const result = await acceptOrder(order.id)
    if (result?.error) { setError(result.error); setLoading(null); return }

    // Impressão da etiqueta via QZ Tray (best-effort)
    const labelData: LabelData = {
      customerName,
      address: order.delivery_address,
      items: itemNames,
      orderId: order.id,
      acceptedAt: new Date().toISOString(),
    }
    try {
      await printLabel('Bematech MP-4200 TH', labelData)
      await updatePrintStatus(order.id, 'printed')
    } catch {
      await updatePrintStatus(order.id, 'failed').catch(() => {})
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading('reject')
    setError('')
    const result = await rejectOrder(order.id)
    if (result?.error) setError(result.error)
    setLoading(null)
  }

  async function handleDispatch() {
    setLoading('dispatch')
    setError('')
    const result = await dispatchOrder(order.id)
    if (result?.error) setError(result.error)
    setLoading(null)
  }

  async function handleReprint() {
    setLoading('print')
    const labelData: LabelData = {
      customerName,
      address: order.delivery_address,
      items: itemNames,
      orderId: order.id,
      acceptedAt: order.accepted_at ?? new Date().toISOString(),
    }
    try {
      await printLabel('Bematech MP-4200 TH', labelData)
      await updatePrintStatus(order.id, 'printed')
    } catch {
      setError('QZ Tray não está aberto ou impressora não encontrada.')
      await updatePrintStatus(order.id, 'failed').catch(() => {})
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{customerName}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant="outline">{TYPE_LABEL[order.type] ?? order.type}</Badge>
            {order.type === 'fresh_credit' && (
              <span className="text-xs text-orange-600 font-medium">
                {credits} crédito{credits !== 1 ? 's' : ''} restante{credits !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{date}</p>
          {order.profiles?.phone && (
            <p className="text-xs text-gray-500">{order.profiles.phone}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {order.total > 0 && (
            <p className="font-semibold text-gray-700">{formatCurrency(order.total)}</p>
          )}
          {order.total === 0 && order.type === 'fresh_credit' && (
            <p className="text-sm text-orange-600 font-medium">1 crédito</p>
          )}
        </div>
      </div>

      {/* Itens */}
      {itemNames.length > 0 && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Itens: </span>
          {itemNames.join(', ')}
        </div>
      )}

      {/* Endereço */}
      {order.delivery_address && (
        <p className="text-sm text-gray-500">📍 {order.delivery_address}</p>
      )}

      {/* Observações */}
      {order.notes && (
        <p className="text-sm text-gray-500 italic">"{order.notes}"</p>
      )}

      {/* Status de impressão */}
      {order.status === 'accepted' && order.print_status !== 'pending' && (
        <p className={`text-xs ${order.print_status === 'printed' ? 'text-green-600' : 'text-amber-600'}`}>
          {PRINT_STATUS_LABEL[order.print_status]}
        </p>
      )}

      {/* Erro */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2 pt-1">
        {order.status === 'pending' && (
          <>
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={!!loading}
            >
              {loading === 'accept' ? 'Aceitando...' : 'Aceitar'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={!!loading}
            >
              {loading === 'reject' ? 'Recusando...' : 'Recusar'}
            </Button>
          </>
        )}
        {order.status === 'accepted' && (
          <>
            <Button
              size="sm"
              onClick={handleDispatch}
              disabled={!!loading}
            >
              {loading === 'dispatch' ? 'Despachando...' : 'Despachar'}
            </Button>
            {order.print_status === 'failed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReprint}
                disabled={!!loading}
              >
                {loading === 'print' ? 'Imprimindo...' : 'Reimprimir etiqueta'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
