/**
 * The five limbs of the Vedic day for an instant: tithi, vara, nakshatra,
 * yoga, karana, plus the Moon's and Sun's rashi. Tithi, yoga and karana are
 * tropical (they depend only on the Sun–Moon angle); nakshatra and rashi are
 * sidereal (Lahiri). Names follow the tables in Sriinnu's kshana.
 */
import { getMoonLongitude, getSiderealLongitudes, getSunLongitude, normalizeDegrees, toJulianDay } from './ephemeris'

export const TITHI_NAMES = [
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
  'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
  'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
] as const

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
] as const

export const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
] as const

const KARANA_REPEAT = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti'] as const

export const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
] as const

export const VARA_NAMES = ['Bhanuvara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvara', 'Shukravara', 'Shanivara'] as const

export type Paksha = 'Shukla' | 'Krishna'

export interface Panchangam {
  julianDay: number
  tithi: { index: number; name: string; paksha: Paksha; elongationDegrees: number }
  vara: { index: number; name: string }
  nakshatra: { index: number; name: string; positionDegrees: number }
  yoga: { index: number; name: string }
  karana: { index: number; name: string }
  moonRashi: { index: number; name: string }
  sunRashi: { index: number; name: string }
}

const NAKSHATRA_SPAN = 360 / 27

function karanaName(halfTithiIndex: number): string {
  if (halfTithiIndex === 0) return 'Kimstughna'
  if (halfTithiIndex === 57) return 'Shakuni'
  if (halfTithiIndex === 58) return 'Chatushpada'
  if (halfTithiIndex === 59) return 'Nagava'
  return KARANA_REPEAT[(halfTithiIndex - 1) % 7]
}

/** The panchangam for an instant; the weekday is the local calendar day. */
export function computePanchangam(date: Date): Panchangam {
  const julianDay = toJulianDay(date)
  const sun = getSunLongitude(julianDay)
  const moon = getMoonLongitude(julianDay)
  const sidereal = getSiderealLongitudes(julianDay)

  const elongation = normalizeDegrees(moon - sun)
  const tithiIndex = Math.floor(elongation / 12)
  const yogaIndex = Math.floor(normalizeDegrees(sidereal.sun + sidereal.moon) / NAKSHATRA_SPAN)
  const halfTithiIndex = Math.floor(elongation / 6)
  const nakshatraIndex = Math.floor(sidereal.moon / NAKSHATRA_SPAN)
  const varaIndex = date.getDay()

  return {
    julianDay,
    tithi: {
      index: tithiIndex + 1,
      name: TITHI_NAMES[tithiIndex],
      paksha: tithiIndex < 15 ? 'Shukla' : 'Krishna',
      elongationDegrees: elongation,
    },
    vara: { index: varaIndex, name: VARA_NAMES[varaIndex] },
    nakshatra: {
      index: nakshatraIndex + 1,
      name: NAKSHATRA_NAMES[nakshatraIndex],
      positionDegrees: sidereal.moon % NAKSHATRA_SPAN,
    },
    yoga: { index: yogaIndex + 1, name: YOGA_NAMES[yogaIndex] },
    karana: { index: halfTithiIndex + 1, name: karanaName(halfTithiIndex) },
    moonRashi: { index: Math.floor(sidereal.moon / 30) + 1, name: RASHI_NAMES[Math.floor(sidereal.moon / 30)] },
    sunRashi: { index: Math.floor(sidereal.sun / 30) + 1, name: RASHI_NAMES[Math.floor(sidereal.sun / 30)] },
  }
}

/** One line for a status bar: "Shukla Dvitiya · Rohini · Budhavara". */
export function formatPanchangamLine(panchangam: Panchangam): string {
  const tithi = panchangam.tithi.name === 'Purnima' || panchangam.tithi.name === 'Amavasya'
    ? panchangam.tithi.name
    : `${panchangam.tithi.paksha} ${panchangam.tithi.name}`
  return `${tithi} · ${panchangam.nakshatra.name} · ${panchangam.vara.name}`
}

/** The rest of the limbs, for a tooltip. */
export function formatPanchangamDetail(panchangam: Panchangam): string {
  return [
    `Tithi ${panchangam.tithi.paksha} ${panchangam.tithi.name}`,
    `Nakshatra ${panchangam.nakshatra.name}`,
    `Yoga ${panchangam.yoga.name}`,
    `Karana ${panchangam.karana.name}`,
    `Moon in ${panchangam.moonRashi.name}`,
    'Computed on this device (built-in approximation, Lahiri)',
  ].join(' · ')
}
