import { describe, it, expect } from 'vitest'
import { verifyWebhookSignature, buildPixPayload } from '@/lib/pagarme'
import crypto from 'crypto'

describe('verifyWebhookSignature', () => {
  it('valida assinatura correta', () => {
    const secret = 'test_secret'
    const payload = '{"id":"ch_abc123","type":"charge.paid"}'
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const signature = `sha256=${hash}`
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true)
  })

  it('rejeita assinatura incorreta', () => {
    expect(verifyWebhookSignature('{"id":"abc"}', 'sha256=invalida000', 'secret')).toBe(false)
  })

  it('rejeita assinatura vazia', () => {
    expect(verifyWebhookSignature('{}', '', 'secret')).toBe(false)
  })

  it('rejeita secret vazio', () => {
    expect(verifyWebhookSignature('{}', 'sha256=abc', '')).toBe(false)
  })
})

describe('buildPixPayload', () => {
  it('constrói payload Pix com campos obrigatórios', () => {
    const payload = buildPixPayload({
      code: 'BADU-001',
      amountInCents: 2990,
      customer: { name: 'João Silva', email: 'joao@test.com', cpf: '12345678901' },
      expiresInSeconds: 1800,
    })
    expect(payload.payment_method).toBe('pix')
    expect(payload.amount).toBe(2990)
    expect(payload.pix.expires_in).toBe(1800)
    expect(payload.customer.document).toBe('12345678901')
    expect(payload.customer.type).toBe('individual')
    expect(payload.code).toBe('BADU-001')
  })

  it('inclui metadata quando fornecida', () => {
    const payload = buildPixPayload({
      code: 'BADU-002',
      amountInCents: 1000,
      customer: { name: 'Ana', email: 'ana@test.com', cpf: '00000000000' },
      expiresInSeconds: 900,
      metadata: { payment_id: 'uuid-123' },
    })
    expect(payload.metadata?.payment_id).toBe('uuid-123')
  })
})
