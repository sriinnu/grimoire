import { useEffect, useState } from 'react'
import { countWords } from '../utils/wikilinks'

export const LIVE_WORD_COUNT_DEBOUNCE_MS = 300

/**
 * Word count that follows the editor as you type, settling 300ms after the
 * last change. Starts from the saved count when the vault has one so the
 * meta line never flashes a different number on open.
 */
export function useLiveWordCount(content: string, savedCount: number | null | undefined): number {
  const [count, setCount] = useState(() => (typeof savedCount === 'number' ? savedCount : countWords(content)))

  useEffect(() => {
    const timer = window.setTimeout(() => setCount(countWords(content)), LIVE_WORD_COUNT_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [content])

  return count
}
