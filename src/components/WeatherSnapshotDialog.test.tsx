import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WeatherSnapshotDialog } from './WeatherSnapshotDialog'

function response(body: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  }
}

describe('WeatherSnapshotDialog', () => {
  it('fetches and inserts a weather block', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({
        results: [{
          name: 'Vienna',
          country: 'Austria',
          latitude: 48.2,
          longitude: 16.37,
        }],
      }) as Response)
      .mockResolvedValueOnce(response({
        current: {
          time: '2026-04-28T09:00',
          temperature_2m: 64,
          apparent_temperature: 62,
          relative_humidity_2m: 52,
          precipitation: 0,
          weather_code: 1,
          wind_speed_10m: 4.2,
        },
      }) as Response)
    const onInsert = vi.fn()
    const onClose = vi.fn()

    render(<WeatherSnapshotDialog open={true} onInsert={onInsert} onClose={onClose} />)

    fireEvent.change(screen.getByTestId('weather-location'), { target: { value: 'Vienna' } })
    fireEvent.click(screen.getByTestId('insert-weather'))

    await waitFor(() => {
      expect(onInsert).toHaveBeenCalledWith(expect.stringContaining('Weather - Vienna, Austria'))
    })
    expect(onClose).toHaveBeenCalled()

    fetchSpy.mockRestore()
  })
})
