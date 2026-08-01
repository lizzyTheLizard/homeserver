const FALLBACK_LAT = 46.948
const FALLBACK_LON = 7.4474
const LOCAL_STORAGE_KEY = 'geolocation'

function getStoredLocation(): { lon: number, lat: number } {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as { lon: number, lat: number }
      if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
        return parsed
      }
    }
  }
  catch (error) {
    console.warn('Failed to read stored location:', error)
  }
  return { lat: FALLBACK_LAT, lon: FALLBACK_LON }
}

function updateLocationInBackground() {
  try {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lon: p.coords.longitude }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pos))
      },
      (error) => { console.warn('Geolocation update failed:', error) },
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 3600000 },
    )
  }
  catch (error) {
    console.warn('Geolocation API unavailable:', error)
  }
}

export function getLocation(): { lon: number, lat: number } {
  const cached = getStoredLocation()
  updateLocationInBackground()
  return cached
}
