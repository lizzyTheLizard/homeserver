import { describe, expect, test } from 'vitest'
import { getLocationByName, getLocationDescription } from './openstreetmap'

describe('getLocationDescription', () => {
  test('should return a location description for Berlin', async () => {
    const result = await getLocationDescription({ lat: 52.52, lon: 13.405 })
    expect(result).toBeDefined()
    expect(result).toContain('Berlin')
  })

  test('should return a location description for London', async () => {
    const result = await getLocationDescription({ lat: 51.5074, lon: -0.1278 })
    expect(result).toBeDefined()
    expect(result).toContain('City of Westminster')
  })

  test('should return a location description for Paris', async () => {
    const result = await getLocationDescription({ lat: 48.8566, lon: 2.3522 })
    expect(result).toBeDefined()
    expect(result).toContain('Paris')
  })
})

describe('getLocationByName', () => {
  test('should return coordinates for Tokyo within 1 degree', async () => {
    const result = await getLocationByName('Tokyo')
    expect(result.lat).toBeGreaterThan(35)
    expect(result.lat).toBeLessThan(36)
    expect(result.lon).toBeGreaterThan(139)
    expect(result.lon).toBeLessThan(140)
  })

  test('should return coordinates for London within expected range', async () => {
    const result = await getLocationByName('London')
    expect(result.lat).toBeGreaterThan(51)
    expect(result.lat).toBeLessThan(52)
    expect(result.lon).toBeGreaterThan(-1)
    expect(result.lon).toBeLessThan(1)
  })

  test('should return coordinates for New York within expected range', async () => {
    const result = await getLocationByName('New York City')
    expect(result.lat).toBeGreaterThan(40)
    expect(result.lat).toBeLessThan(41)
    expect(result.lon).toBeGreaterThan(-75)
    expect(result.lon).toBeLessThan(-73)
  })

  test('should throw for a non-existent place name', async () => {
    await expect(getLocationByName('xyznonexistentplace123456')).rejects.toThrow()
  })
})
