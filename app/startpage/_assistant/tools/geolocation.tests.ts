import { describe, expect, test } from 'vitest'
import { getGeolocationTools, getLocationDescription } from './geolocation'

describe('getLocationDescription', () => {
  test('should return a location description for Berlin', async () => {
    const result = await getLocationDescription({ lat: 52.52, lon: 13.405 })
    expect(result).toBeDefined()
    expect(result).toContain('Berlin')
  })
})

describe('locationByNameTool', () => {
  test('should return coordinates for Tokyo within 1 degree', async () => {
    const tools = getGeolocationTools()
    const { execute } = tools.get_location_by_name
    if (!execute) throw new Error('get_location_by_name tool not found')
    const result = await execute(
      { name: 'Tokyo' },
      { toolCallId: 'test', messages: [], context: {} },
    ) as { lat: number, lon: number }
    expect(result.lat).toBeGreaterThan(35)
    expect(result.lat).toBeLessThan(36)
    expect(result.lon).toBeGreaterThan(139)
    expect(result.lon).toBeLessThan(140)
  })
})
