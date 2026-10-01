/**
 * Names the moment you opened the notebook — "Thursday evening · September 25".
 * Sriinnu: the hero eyebrow used to repeat "Grimoire", which the sidebar
 * already says. A notebook that knows what time of day it is feels kept, not
 * launched.
 */
export type PartOfDay = 'early morning' | 'morning' | 'afternoon' | 'evening' | 'night'

export function partOfDay(hour: number): PartOfDay {
  if (hour < 5) return 'night'
  if (hour < 8) return 'early morning'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

export function dashboardMomentLabel(now: Date, locale?: string): string {
  const weekday = now.toLocaleDateString(locale, { weekday: 'long' })
  const date = now.toLocaleDateString(locale, { month: 'long', day: 'numeric' })
  return `${weekday} ${partOfDay(now.getHours())} · ${date}`
}
