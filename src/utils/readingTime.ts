/** Adult silent reading speed for non-fiction, rounded from Brysbaert (2019). */
export const READING_WORDS_PER_MINUTE = 238

/** Below this a reading time is noise: "1 min read" on a two-line note says nothing. */
export const READING_TIME_MIN_WORDS = 30

/** Whole minutes to read `words`, or null when the note is too short to bother. */
export function readingTimeMinutes(words: number, wordsPerMinute = READING_WORDS_PER_MINUTE): number | null {
  if (!Number.isFinite(words) || words < READING_TIME_MIN_WORDS) return null
  return Math.max(1, Math.round(words / wordsPerMinute))
}

/** "3 min read", or null when there is nothing worth saying. */
export function formatReadingTime(words: number, wordsPerMinute = READING_WORDS_PER_MINUTE): string | null {
  const minutes = readingTimeMinutes(words, wordsPerMinute)
  return minutes === null ? null : `${minutes} min read`
}
