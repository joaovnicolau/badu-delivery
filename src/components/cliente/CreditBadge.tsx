export function CreditBadge({ balance }: { balance: number }) {
  return (
    <div className="inline-flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
      <span className="text-4xl font-bold text-orange-600">{balance}</span>
      <div>
        <p className="text-sm font-semibold text-orange-800">
          {balance === 1 ? 'crédito disponível' : 'créditos disponíveis'}
        </p>
        <p className="text-xs text-orange-500">1 crédito = 1 marmita fresca</p>
      </div>
    </div>
  )
}
