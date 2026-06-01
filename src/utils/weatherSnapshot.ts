export { appendMarkdownBlock } from './markdownBlock'

/** Temperature and unit system used when inserting weather into a note. */
export type WeatherTemperatureUnit = 'fahrenheit' | 'celsius'

interface FetchLike {
  (input: string): Promise<{ ok: boolean; json: () => Promise<unknown> }>
}

/** Markdown weather block plus the resolved place label. */
interface WeatherSnapshot {
  markdown: string
  locationLabel: string
}

interface GeocodingLocation {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
  timezone?: string
}

interface CurrentWeather {
  time?: string
  temperature_2m?: number
  apparent_temperature?: number
  relative_humidity_2m?: number
  precipitation?: number
  weather_code?: number
  wind_speed_10m?: number
}

const WEATHER_CODE_LABELS = new Map<number, string>([
  [0, 'Clear sky'],
  [1, 'Mainly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Rime fog'],
  [51, 'Light drizzle'],
  [53, 'Drizzle'],
  [55, 'Dense drizzle'],
  [61, 'Light rain'],
  [63, 'Rain'],
  [65, 'Heavy rain'],
  [71, 'Light snow'],
  [73, 'Snow'],
  [75, 'Heavy snow'],
  [80, 'Light showers'],
  [81, 'Showers'],
  [82, 'Heavy showers'],
  [95, 'Thunderstorm'],
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function formatNumber(value: number | undefined, digits = 0): string {
  return value === undefined ? 'n/a' : value.toFixed(digits)
}

function formatLocation(location: GeocodingLocation): string {
  return [location.name, location.admin1, location.country].filter(Boolean).join(', ')
}

function weatherDescription(code: number | undefined): string {
  if (code === undefined) return 'Current conditions'
  return WEATHER_CODE_LABELS.get(code) ?? `Weather code ${code}`
}

function parseLocation(value: unknown): GeocodingLocation | null {
  if (!isRecord(value)) return null

  const name = asString(value.name)
  const latitude = asNumber(value.latitude)
  const longitude = asNumber(value.longitude)
  if (!name || latitude === undefined || longitude === undefined) return null

  return {
    name,
    latitude,
    longitude,
    country: asString(value.country),
    admin1: asString(value.admin1),
    timezone: asString(value.timezone),
  }
}

function parseFirstLocation(value: unknown): GeocodingLocation | null {
  if (!isRecord(value) || !Array.isArray(value.results)) return null
  return parseLocation(value.results[0])
}

function parseCurrentWeather(value: unknown): CurrentWeather {
  if (!isRecord(value) || !isRecord(value.current)) return {}

  return {
    time: asString(value.current.time),
    temperature_2m: asNumber(value.current.temperature_2m),
    apparent_temperature: asNumber(value.current.apparent_temperature),
    relative_humidity_2m: asNumber(value.current.relative_humidity_2m),
    precipitation: asNumber(value.current.precipitation),
    weather_code: asNumber(value.current.weather_code),
    wind_speed_10m: asNumber(value.current.wind_speed_10m),
  }
}

function unitSuffix(unit: WeatherTemperatureUnit): { temperature: string; wind: string; precipitation: string } {
  return unit === 'fahrenheit'
    ? { temperature: 'F', wind: 'mph', precipitation: 'in' }
    : { temperature: 'C', wind: 'km/h', precipitation: 'mm' }
}

function buildGeocodingUrl(query: string): string {
  const params = new URLSearchParams({
    name: query,
    count: '1',
    language: 'en',
    format: 'json',
  })
  return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`
}

function buildForecastUrl(location: GeocodingLocation, unit: WeatherTemperatureUnit): string {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    timezone: location.timezone ?? 'auto',
    temperature_unit: unit,
    wind_speed_unit: unit === 'fahrenheit' ? 'mph' : 'kmh',
    precipitation_unit: unit === 'fahrenheit' ? 'inch' : 'mm',
  })
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

/** Fetches current weather from Open-Meteo and returns a markdown note block. */
export async function createWeatherSnapshotMarkdown(
  locationQuery: string,
  unit: WeatherTemperatureUnit,
  fetchImpl: FetchLike = fetch,
): Promise<WeatherSnapshot> {
  const query = locationQuery.trim()
  if (!query) throw new Error('Enter a location first.')

  const geocodeResponse = await fetchImpl(buildGeocodingUrl(query))
  if (!geocodeResponse.ok) throw new Error('Could not search that location.')

  const location = parseFirstLocation(await geocodeResponse.json())
  if (!location) throw new Error(`No weather location matched "${query}".`)

  const weatherResponse = await fetchImpl(buildForecastUrl(location, unit))
  if (!weatherResponse.ok) throw new Error('Could not fetch current weather.')

  const current = parseCurrentWeather(await weatherResponse.json())
  const units = unitSuffix(unit)
  const locationLabel = formatLocation(location)
  const capturedAt = current.time ?? new Date().toISOString()

  return {
    locationLabel,
    markdown: [
      `> [!weather] Weather - ${locationLabel}`,
      `> ${weatherDescription(current.weather_code)}, ${formatNumber(current.temperature_2m)}°${units.temperature} (feels ${formatNumber(current.apparent_temperature)}°${units.temperature})`,
      `> Humidity ${formatNumber(current.relative_humidity_2m)}% · Wind ${formatNumber(current.wind_speed_10m, 1)} ${units.wind} · Precip ${formatNumber(current.precipitation, 2)} ${units.precipitation}`,
      `> Captured ${capturedAt}. Source: Open-Meteo.`,
    ].join('\n'),
  }
}
