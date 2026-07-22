export interface GeocodeResult {
  label: string
  lat: number
  lng: number
}

export function useGeocode() {
  function search(query: string) {
    return $fetch<GeocodeResult[]>('/api/geocode/search', {
      query: { q: query }
    })
  }

  function reverse(lat: number, lng: number) {
    return $fetch<{ location: string | null }>('/api/geocode/reverse', {
      query: { lat, lng }
    })
  }

  return { search, reverse }
}
