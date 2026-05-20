import Image from 'next/image'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  photo_url: string | null
  price: number
  type: 'fresh' | 'frozen'
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
      <div className="relative h-44 bg-gray-100">
        {product.photo_url ? (
          <Image
            src={product.photo_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">🍱</div>
        )}
        {product.type === 'frozen' && (
          <Badge className="absolute top-2 left-2 bg-blue-500">Congelada</Badge>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-orange-600">{formatCurrency(product.price)}</span>
          <Link href={`/produto/${product.slug}`}>
            <Button size="sm" variant="outline">Ver detalhes</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
