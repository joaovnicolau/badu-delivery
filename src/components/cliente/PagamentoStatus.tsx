'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  qrCode: string
  qrCodeUrl: string
  expiresAt: string
}

export function PagamentoStatus({ qrCode, qrCodeUrl, expiresAt }: Props) {
  const [copied, setCopied] = useState(false)

  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '30 min'

  async function handleCopy() {
    await navigator.clipboard.writeText(qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl border">
      <p className="font-semibold text-gray-800 text-lg">Pague com Pix</p>
      <p className="text-sm text-gray-500">QR code válido até {expiry}</p>

      {qrCodeUrl && (
        <div className="border-2 border-gray-100 rounded-xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeUrl} alt="QR Code Pix" width={200} height={200} />
        </div>
      )}

      <div className="w-full">
        <p className="text-xs text-gray-500 mb-2 text-center">Ou copie o código Pix Copia e Cola:</p>
        <div className="flex gap-2">
          <code className="flex-1 text-xs bg-gray-50 border rounded p-2 overflow-hidden text-ellipsis whitespace-nowrap">
            {qrCode || 'Código não disponível'}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopy} disabled={!qrCode}>
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Seus créditos são adicionados automaticamente em até 1 minuto após o pagamento.
      </p>
    </div>
  )
}
