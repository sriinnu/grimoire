import { useEffect, useState } from 'react'
import { loadIconOptions, type IconEntry } from '../utils/iconRegistry'

/** Lazily loads the full icon picker catalog after an icon editing surface opens. */
export function useIconOptions(): { iconOptions: IconEntry[]; iconsLoaded: boolean } {
  const [iconOptions, setIconOptions] = useState<IconEntry[]>([])
  const [iconsLoaded, setIconsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadIconOptions().then((options) => {
      if (cancelled) return
      setIconOptions(options)
      setIconsLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { iconOptions, iconsLoaded }
}
