// Temporary stub — replaced in Task 7
export function PackSection({ title, description, packs }: {
  title: string
  description: string
  packs: Array<{ id: string; name: string; description: string | null; quantity: number; price: number; unit: string }>
}) {
  if (packs.length === 0) return null
  return (
    <section className="mb-10">
      <div className="mb-4 border-b pb-2">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <p className="text-gray-400 text-sm">{packs.length} pacote(s) — UI em breve</p>
    </section>
  )
}
