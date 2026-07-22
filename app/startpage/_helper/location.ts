const FALLBACK_LAT = 46.948
const FALLBACK_LON = 7.4474

export async function getLocation(): Promise<{ lon: number, lat: number }> {
  try {
    return await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => { resolve({ lat: p.coords.latitude, lon: p.coords.longitude }) },
        reject,
        { timeout: 5000, enableHighAccuracy: false, maximumAge: 3600000 },
      )
    })
  }
  catch (error) {
    const pos = { lat: FALLBACK_LAT, lon: FALLBACK_LON }
    console.warn('Unable to get geolocation, using fallback coordinates', pos, error)
    return pos
  }
}
