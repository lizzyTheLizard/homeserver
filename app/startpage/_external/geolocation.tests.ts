import { describe, expect, test } from 'vitest'
import { getLocationDescription, getLocationByName, locationByNameTool } from './geolocation'

describe('getLocationDescription', () => {
  test('should return a location description for Berlin', async () => {
    const result = await getLocationDescription({ lat: 52.52, lon: 13.405 })
    expect(result).toBeDefined()
    expect(result).toContain('Berlin')
  })
})

describe('getLocationByName', () => {
  test('should return coordinates for Paris', async () => {
    const result = await getLocationByName('Paris')
    expect(result).toBeDefined()
    expect(result.lat).toBeGreaterThan(48)
    expect(result.lat).toBeLessThan(49)
    expect(result.lon).toBeGreaterThan(2)
    expect(result.lon).toBeLessThan(3)
  })
})

describe('locationByNameTool', () => {
  test('should return coordinates for Tokyo within 1 degree', async () => {
    const execute = locationByNameTool.execute
    const result = await execute({ name: 'Tokyo' }, { toolCallId: 'test', messages: [], context: {} }) as { lat: number, lon: number }
    expect(result.lat).toBeGreaterThan(35)
    expect(result.lat).toBeLessThan(36)
    expect(result.lon).toBeGreaterThan(139)
    expect(result.lon).toBeLessThan(140)
  })
})
