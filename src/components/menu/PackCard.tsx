import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Pack = {
  id: string
  name: string
  description: string | null
  quantity: number
  price: number
  unit: string
  packType: 'fresh' | 'frozen'
}

export function PackCard({ pack }: { pack: Pack }) {
  const checkoutTipo = pack.packType === 'fresh' ? 'fresh_pack' : 'frozen_pack'
  const checkoutUrl = `/checkout?tipo=${checkoutTipo}&packId=${pack.id}`

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-gray-900">{pack.name}</h3>
        <p className="text-sm text-gray-500 mt-1">{pack.quantity} {pack.unit}</p>
        {pack.description && (
          <p className="text-sm text-gray-500 mt-1">{pack.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="font-bold text-orange-600 text-lg">{formatCurrency(pack.price)}</span>
        <Link href={checkoutUrl}>
          <Button size="sm">Comprar</Button>
        </Link>
      </div>
    </div>
  )
}
