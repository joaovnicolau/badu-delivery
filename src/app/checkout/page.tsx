'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PagamentoStatus } from '@/components/cliente/PagamentoStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

type ItemInfo = { name: string; price: number }
type PixData = { qr_code: string; qr_code_url: string; expires_at: string }

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tipo = searchParams.get('tipo') ?? ''
  const produtoId = searchParams.get('produtoId') ?? ''
  const packId = searchParams.get('packId') ?? ''

  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [itemInfo, setItemInfo] = useState<ItemInfo | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function loadItem() {
      if ((tipo === 'credito' || tipo === 'single') && produtoId) {
        const { data } = await (supabase.from('products').select('name, price').eq('id', produtoId).single() as unknown as Promise<{ data: ItemInfo | null }>)
        if (data) setItemInfo(data)
      } else if (tipo === 'fresh_pack' && packId) {
        const { data } = await (supabase.from('fresh_credit_packs').select('name, price').eq('id', packId).single() as unknown as Promise<{ data: ItemInfo | null }>)
        if (data) setItemInfo(data)
      } else if (tipo === 'frozen_pack' && packId) {
        const { data } = await (supabase.from('frozen_packs').select('name, price').eq('id', packId).single() as unknown as Promise<{ data: ItemInfo | null }>)
        if (data) setItemInfo(data)
      }
    }
    if (tipo) loadItem()
  }, [tipo, produtoId, packId])

  async function handleCreditOrder() {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase as any).rpc('rpc_place_order', {
        p_customer_id: user.id,
        p_product_id: produtoId,
        p_notes: notes || null,
      })

      if (rpcError) {
        if (rpcError.message.includes('insufficient_credits')) setError('Você não tem créditos suficientes.')
        else if (rpcError.message.includes('product_not_found')) setError('Produto não encontrado ou inativo.')
        else if (rpcError.message.includes('unauthorized')) setError('Sessão expirada. Faça login novamente.')
        else setError('Erro ao fazer pedido. Tente novamente.')
        return
      }

      router.push('/minha-conta?pedido=ok')
    } finally {
      setLoading(false)
    }
  }

  async function handlePixPayment() {
    setLoading(true)
    setError('')
    try {
      const itemId = (tipo === 'fresh_pack' || tipo === 'frozen_pack') ? packId : produtoId
      const paymentType = tipo === 'fresh_pack' ? 'fresh_credit_pack'
        : tipo === 'frozen_pack' ? 'frozen_pack'
        : 'single'

      const res = await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: paymentType, itemId }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'cpf_required') setError('Cadastre seu CPF no perfil antes de pagar com Pix.')
        else if (data.error === 'unauthorized') router.push('/login?redirect=/checkout?' + searchParams.toString())
        else setError(data.error ?? 'Erro ao criar pagamento. Tente novamente.')
        return
      }

      setPixData({ qr_code: data.qr_code, qr_code_url: data.qr_code_url, expires_at: data.expires_at })
    } finally {
      setLoading(false)
    }
  }

  if (pixData) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <h1 className="text-xl font-bold text-center mb-6">Pagamento Pix</h1>
        <PagamentoStatus
          qrCode={pixData.qr_code}
          qrCodeUrl={pixData.qr_code_url}
          expiresAt={pixData.expires_at}
        />
        <p className="text-center mt-6">
          <Link href="/minha-conta" className="text-sm text-orange-600 hover:underline">
            Ir para minha conta →
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-xl font-bold text-center mb-6">Finalizar compra</h1>

      {itemInfo && (
        <div className="bg-white rounded-xl border p-4 mb-6">
          <p className="font-medium text-gray-900">{itemInfo.name}</p>
          {tipo === 'credito' ? (
            <p className="text-orange-600 font-medium text-sm mt-1">1 crédito</p>
          ) : (
            <p className="text-orange-600 font-bold text-lg mt-1">{formatCurrency(itemInfo.price)}</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">{error}</p>}

      {tipo === 'credito' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, sem arroz..."
            />
          </div>
          <Button className="w-full" onClick={handleCreditOrder} disabled={loading || !produtoId}>
            {loading ? 'Fazendo pedido...' : 'Confirmar pedido (1 crédito)'}
          </Button>
        </div>
      )}

      {(tipo === 'fresh_pack' || tipo === 'frozen_pack' || tipo === 'single') && (
        <div className="space-y-3">
          <Button className="w-full" onClick={handlePixPayment} disabled={loading}>
            {loading ? 'Gerando QR Code...' : 'Pagar com Pix'}
          </Button>
          <p className="text-xs text-center text-gray-400">
            Sem CPF cadastrado?{' '}
            <Link href="/minha-conta/perfil" className="text-orange-600 hover:underline">Cadastrar agora</Link>
          </p>
        </div>
      )}

      {!tipo && (
        <div className="text-center">
          <p className="text-gray-500 mb-4">Nenhum item selecionado.</p>
          <Link href="/" className="text-orange-600 hover:underline">← Ver cardápio</Link>
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Carregando...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
