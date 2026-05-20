import { PackCard } from './PackCard'

type Pack = {
  id: string
  name: string
  description: string | null
  quantity: number
  price: number
  unit: string
}

export function PackSection({
  title,
  description,
  packs,
}: {
  title: string
  description: string
  packs: Pack[]
}) {
  if (packs.length === 0) return null

  return (
    <section className="mb-10">
      <div className="mb-4 border-b pb-2">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {packs.map((pack) => (
          <PackCard key={pack.id} pack={pack} />
        ))}
      </div>
    </section>
  )
}
