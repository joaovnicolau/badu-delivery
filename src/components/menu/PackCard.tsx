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
}

export function PackCard({ pack }: { pack: Pack }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-gray-900">{pack.name}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {pack.quantity} {pack.unit}
        </p>
        {pack.description && (
          <p className="text-sm text-gray-500 mt-1">{pack.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="font-bold text-orange-600 text-lg">{formatCurrency(pack.price)}</span>
        <Link href="/login?redirect=/checkout">
          <Button size="sm">Comprar</Button>
        </Link>
      </div>
    </div>
  )
}
