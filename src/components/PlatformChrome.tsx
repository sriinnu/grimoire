import { lazy, Suspense } from 'react'
import { shouldUseLinuxWindowChrome } from '../utils/platform'

const LinuxTitlebar = lazy(async () => ({
  default: (await import('./LinuxTitlebar')).LinuxTitlebar,
}))

/** Loads platform-specific window chrome only when that platform needs it. */
export function PlatformChrome() {
  if (!shouldUseLinuxWindowChrome()) return null

  return (
    <Suspense fallback={null}>
      <LinuxTitlebar />
    </Suspense>
  )
}
