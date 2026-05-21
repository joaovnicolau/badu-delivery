export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address)
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=br`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'badu-delivery/1.0' },
    })
    if (!response.ok) {
      console.error('Nominatim HTTP error:', response.status)
      return null
    }
    const results: unknown = await response.json()
    if (!Array.isArray(results) || !results.length) return null
    const first = results[0] as { lat?: string; lon?: string }
    const lat = parseFloat(first.lat ?? '')
    const lng = parseFloat(first.lon ?? '')
    if (isNaN(lat) || isNaN(lng)) return null
    return { lat, lng }
  } catch (err) {
    console.error('Nominatim unreachable:', err)
    return null
  }
}
