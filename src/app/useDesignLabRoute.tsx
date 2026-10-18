import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'

// Dev-only design artifact route (#design-lab); code-split so it never ships in the bundle.
const DesignLab = lazy(() => import('../design-lab/DesignLab'))

/** Renders the #design-lab route while the DEV-only hash is active, else null. */
export function useDesignLabRoute(): ReactNode {
  const [active, setActive] = useState(
    () => import.meta.env.DEV && window.location.hash === '#design-lab',
  )
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const sync = () => setActive(window.location.hash === '#design-lab')
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (!active) return null
  return (
    <Suspense fallback={null}>
      <DesignLab />
    </Suspense>
  )
}
