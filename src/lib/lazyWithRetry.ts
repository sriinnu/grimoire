import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RETRY_DELAY_MS = 800

/**
 * lazy() with one automatic retry. A dynamic import can fail transiently —
 * dev-server transforms under load, HMR races, AV scans, slow disk. Without a
 * retry the rejection is cached by React.lazy and the surface (or, absent an
 * error boundary, the whole app) dies until reload. On final failure the
 * ORIGINAL error is rethrown so the boundary reports the first failure.
 */
// Matches React's own lazy() generic (ComponentType<any>) so specific prop types survive.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy<T> typing
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory()
    } catch (firstError) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      try {
        return await factory()
      } catch {
        throw firstError
      }
    }
  })
}
