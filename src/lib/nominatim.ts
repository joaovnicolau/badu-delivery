export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address)
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'badu-delivery/1.0' },
    })
    if (!response.ok) {
      console.error('Nominatim HTTP error:', response.status)
      return null
    }
    const results: Array<{ lat: string; lon: string }> = await response.json()
    if (!results.length) return null
    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
    }
  } catch (err) {
    console.error('Nominatim unreachable:', err)
    return null
  }
}
