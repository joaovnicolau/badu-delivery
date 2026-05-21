import { describe, it, expect, vi, beforeEach } from 'vitest'
import { geocodeAddress } from '@/lib/nominatim'

describe('geocodeAddress', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna lat/lng para endereço válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-19.75', lon: '-47.93' }],
    }))
    const result = await geocodeAddress('Rua das Flores, 10, Centro, Uberaba')
    expect(result).toEqual({ lat: -19.75, lng: -47.93 })
  })

  it('retorna null quando não há resultados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }))
    const result = await geocodeAddress('Endereço Inexistente XYZ123')
    expect(result).toBeNull()
  })

  it('retorna null para resposta HTTP com erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    const result = await geocodeAddress('Qualquer endereço')
    expect(result).toBeNull()
  })

  it('retorna null quando fetch lança erro de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await geocodeAddress('Qualquer endereço')
    expect(result).toBeNull()
  })
})
