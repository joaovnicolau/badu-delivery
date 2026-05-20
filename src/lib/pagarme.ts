import crypto from 'crypto'

const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'

function getAuthHeader(): string {
  const key = process.env.PAGARME_API_KEY!
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64')
}

// ---- Webhook signature verification ----

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false
  try {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')
    // timingSafeEqual requires same-length buffers
    const sigBuffer = Buffer.from(signature)
    const expBuffer = Buffer.from(expected)
    if (sigBuffer.length !== expBuffer.length) return false
    return crypto.timingSafeEqual(sigBuffer, expBuffer)
  } catch {
    return false
  }
}

// ---- Pix payload builder ----

type PixPayloadInput = {
  code: string
  amountInCents: number
  customer: { name: string; email: string; cpf: string }
  expiresInSeconds: number
  metadata?: Record<string, string>
}

export function buildPixPayload(input: PixPayloadInput) {
  return {
    code: input.code,
    amount: input.amountInCents,
    payment_method: 'pix' as const,
    pix: { expires_in: input.expiresInSeconds },
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      type: 'individual' as const,
      document: input.customer.cpf,
      document_type: 'CPF' as const,
    },
    ...(input.metadata ? { metadata: input.metadata } : {}),
  }
}

// ---- API call ----

export type CreateChargeResult = {
  id: string
  status: string
  qr_code: string
  qr_code_url: string
  expires_at: string
}

export async function createPixCharge(input: PixPayloadInput): Promise<CreateChargeResult> {
  const payload = buildPixPayload(input)
  const response = await fetch(`${PAGARME_BASE_URL}/charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pagar.me ${response.status}: ${text}`)
  }

  const data = await response.json()
  const tx = data.last_transaction ?? {}
  return {
    id: data.id,
    status: data.status,
    qr_code: tx.qr_code ?? '',
    qr_code_url: tx.qr_code_url ?? '',
    expires_at: tx.expires_at ?? '',
  }
}
