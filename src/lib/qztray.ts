export type LabelData = {
  customerName: string
  address: string | null
  items: string[]
  orderId: string
  acceptedAt: string
}

function formatLabel(data: LabelData): string {
  const sep = '================================'
  const lines = [
    sep,
    '         BADU DELIVERY',
    sep,
    `CLIENTE: ${data.customerName}`,
    data.address ? `ENDERECO: ${data.address}` : 'ENDERECO: nao informado',
    sep,
    'ITENS:',
    ...data.items.map(item => `  - ${item}`),
    sep,
    `DATA: ${new Date(data.acceptedAt).toLocaleString('pt-BR')}`,
    `PEDIDO: #${data.orderId.slice(0, 8).toUpperCase()}`,
    sep,
    '',
  ]
  return lines.join('\n')
}

export async function printLabel(
  printerName: string = 'Bematech MP-4200 TH',
  data: LabelData
): Promise<void> {
  // Dynamic import: qz-tray uses browser APIs (WebSocket, crypto)
  const qz = (await import('qz-tray')).default

  // Modo sem assinatura — requer "Allow unsigned" habilitado no QZ Tray
  qz.security.setCertificatePromise((resolve) => resolve(''))
  qz.security.setSignatureAlgorithm('SHA512')
  qz.security.setSignaturePromise(() => (_resolve: (value?: string) => void, _reject: (value?: string) => void) => _resolve(''))

  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 1, delay: 0.5 })
  }

  const printerResult = await qz.printers.find(printerName)
  const printer = Array.isArray(printerResult) ? printerResult[0] : printerResult
  const config = qz.configs.create(printer)
  const printData = [
    {
      type: 'raw' as const,
      format: 'command' as const,
      flavor: 'plain' as const,
      data: formatLabel(data),
    },
  ]

  await qz.print(config, printData)
}

export async function disconnectQZ(): Promise<void> {
  try {
    const qz = (await import('qz-tray')).default
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect()
    }
  } catch {
    // ignore
  }
}
