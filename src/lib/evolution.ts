export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replaceAll(`{{${key}}}`, val),
    template
  )
}

export async function sendWhatsApp(
  phone: string,
  message: string
): Promise<void> {
  const baseUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE_NAME

  if (!baseUrl || !apiKey || !instance) {
    console.warn('Evolution API não configurada — WhatsApp não enviado')
    return
  }

  // Formatar número: somente dígitos, incluir DDI 55 se ausente
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`

  try {
    const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ number, text: message }),
    })

    if (!response.ok) {
      console.error('Evolution API error:', response.status, await response.text())
    }
  } catch (err) {
    // WhatsApp é best-effort — log mas não propaga o erro
    console.error('Evolution API unreachable:', err)
  }
}
