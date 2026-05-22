'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function SavedBanner({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(redirectTo)
    }, 3000)
    return () => clearTimeout(timer)
  }, [router, redirectTo])

  return (
    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
      Perfil atualizado com sucesso!
    </div>
  )
}
