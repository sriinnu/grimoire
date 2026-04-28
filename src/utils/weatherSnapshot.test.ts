import { describe, expect, it, vi } from 'vitest'
import {
  appendMarkdownBlock,
  createWeatherSnapshotMarkdown,
} from './weatherSnapshot'

function response(body: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  }
}

describe('weatherSnapshot', () => {
  it('creates a markdown weather block from Open-Meteo responses', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({
        results: [{
          name: 'Vienna',
          admin1: 'Vienna',
          country: 'Austria',
          latitude: 48.2,
          longitude: 16.37,
          timezone: 'Europe/Vienna',
        }],
      }))
      .mockResolvedValueOnce(response({
        current: {
          time: '2026-04-28T09:00',
          temperature_2m: 18.4,
          apparent_temperature: 17.9,
          relative_humidity_2m: 61,
          precipitation: 0,
          weather_code: 2,
          wind_speed_10m: 8.2,
        },
      }))

    const snapshot = await createWeatherSnapshotMarkdown('Vienna', 'celsius', fetchImpl)

    expect(snapshot.locationLabel).toBe('Vienna, Vienna, Austria')
    expect(snapshot.markdown).toContain('Weather - Vienna, Vienna, Austria')
    expect(snapshot.markdown).toContain('Partly cloudy')
    expect(snapshot.markdown).toContain('18°C')
    expect(fetchImpl.mock.calls[0][0]).toContain('geocoding-api.open-meteo.com')
    expect(fetchImpl.mock.calls[1][0]).toContain('api.open-meteo.com')
  })

  it('throws when no location matches', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({ results: [] }))

    await expect(createWeatherSnapshotMarkdown('Nowhere', 'fahrenheit', fetchImpl))
      .rejects.toThrow('No weather location matched')
  })

  it('appends markdown blocks with a clean separator', () => {
    expect(appendMarkdownBlock('# Day\n\nNotes', '> Weather')).toBe('# Day\n\nNotes\n\n> Weather\n')
    expect(appendMarkdownBlock('', '> Weather')).toBe('> Weather\n')
  })
})
