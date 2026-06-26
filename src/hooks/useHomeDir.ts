import { useEffect, useState } from 'react'
import { getHomeDir } from '../lib/tauriRuntime'

/**
 * Returns the user's home directory once it resolves, or null until then / when
 * unavailable (e.g. the browser demo). Lets path-display chrome collapse home to
 * `~` without blocking the first render.
 */
export function useHomeDir(): string | null {
  const [homeDir, setHomeDir] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getHomeDir().then((dir) => {
      if (active) setHomeDir(dir)
    })
    return () => {
      active = false
    }
  }, [])

  return homeDir
}
