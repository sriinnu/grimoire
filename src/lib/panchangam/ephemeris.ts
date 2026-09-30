/**
 * Low-precision solar and lunar longitudes, good to a few arc-minutes for
 * the Sun and a fraction of a degree for the Moon. Enough for a day's
 * panchangam; not an ephemeris for charts. Ported from the built-in
 * approximation in Sriinnu's kshana (hora-JyotiSaksin), which itself follows
 * the classic Meeus-style series.
 */

const DEG_TO_RAD = Math.PI / 180

export function normalizeDegrees(degrees: number): number {
  const value = degrees % 360
  return value < 0 ? value + 360 : value
}

/** Julian Day for an instant, from its UTC fields. */
export function toJulianDay(date: Date): number {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hour = date.getUTCHours()
  const minute = date.getUTCMinutes()
  const second = date.getUTCSeconds() + date.getUTCMilliseconds() / 1000

  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3

  const julianDayNumber =
    day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045

  const dayFraction = (hour - 12) / 24 + minute / 1440 + second / 86400
  return julianDayNumber + dayFraction
}

/** Apparent geocentric ecliptic longitude of the Sun, degrees. */
export function getSunLongitude(jd: number): number {
  const n = jd - 2451545.0
  const meanLongitude = normalizeDegrees(280.46 + 0.9856474 * n)
  const meanAnomaly = normalizeDegrees(357.528 + 0.9856003 * n)
  const eclipticLongitude =
    meanLongitude + 1.915 * Math.sin(meanAnomaly * DEG_TO_RAD) + 0.02 * Math.sin(2 * meanAnomaly * DEG_TO_RAD)
  return normalizeDegrees(eclipticLongitude)
}

/** Geocentric ecliptic longitude of the Moon, degrees. */
export function getMoonLongitude(jd: number): number {
  const n = jd - 2451545.0
  const meanLongitude = normalizeDegrees(218.316 + 13.176396 * n)
  const meanAnomalyMoon = normalizeDegrees(134.963 + 13.064993 * n)
  const meanAnomalySun = normalizeDegrees(357.529 + 0.9856003 * n)
  const elongation = normalizeDegrees(297.85 + 12.190749 * n)
  const argumentLatitude = normalizeDegrees(93.272 + 13.22935 * n)

  const longitude =
    meanLongitude +
    6.289 * Math.sin(meanAnomalyMoon * DEG_TO_RAD) +
    1.274 * Math.sin((2 * elongation - meanAnomalyMoon) * DEG_TO_RAD) +
    0.658 * Math.sin(2 * elongation * DEG_TO_RAD) +
    0.214 * Math.sin(2 * meanAnomalyMoon * DEG_TO_RAD) +
    0.11 * Math.sin(elongation * DEG_TO_RAD) -
    0.186 * Math.sin(meanAnomalySun * DEG_TO_RAD) -
    0.059 * Math.sin((2 * elongation - 2 * meanAnomalyMoon) * DEG_TO_RAD) +
    0.057 * Math.sin((2 * elongation - meanAnomalySun - meanAnomalyMoon) * DEG_TO_RAD) +
    0.053 * Math.sin((2 * elongation + meanAnomalyMoon) * DEG_TO_RAD) +
    0.046 * Math.sin((2 * elongation - meanAnomalySun) * DEG_TO_RAD) +
    0.041 * Math.sin((meanAnomalySun - meanAnomalyMoon) * DEG_TO_RAD)

  return normalizeDegrees(longitude + 0.1 * Math.sin(argumentLatitude * DEG_TO_RAD))
}

/**
 * Sidereal (nirayana) longitudes using the Lahiri ayanamsa, which is what a
 * panchangam counts nakshatras and rashis from. Linear fit around J2000:
 * 23.853° at J2000, moving about 50.29″ a year.
 */
export function lahiriAyanamsa(jd: number): number {
  const years = (jd - 2451545.0) / 365.25
  return 23.853 + (50.29 / 3600) * years
}

export function getSiderealLongitudes(jd: number): { sun: number; moon: number } {
  const ayanamsa = lahiriAyanamsa(jd)
  return {
    sun: normalizeDegrees(getSunLongitude(jd) - ayanamsa),
    moon: normalizeDegrees(getMoonLongitude(jd) - ayanamsa),
  }
}
