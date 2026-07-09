const FALLBACK_LAT = 46.948
const FALLBACK_LON = 7.4474

export async function getLocation(): Promise<{ lon: number, lat: number }> {
  try {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
      (navigator as any).geolocation.getCurrentPosition(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        (p: any) => { resolve({ lat: p.coords.latitude, lon: p.coords.longitude }) },
        reject,
        { timeout: 5000, enableHighAccuracy: false },
      )
    })
  }
  catch (error) {
    const pos = { lat: FALLBACK_LAT, lon: FALLBACK_LON }
    console.warn('Unable to get geolocation, using fallback coordinates', pos, error)
    return pos
  }
}
