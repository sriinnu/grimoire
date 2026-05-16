import { useCallback, useState } from 'react'
import { APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS, getAppStorageItem } from '../constants/appStorage'

function loadSidebarColumnCollapsed(): boolean {
  return getAppStorageItem('sidebarColumnCollapsed') === '1'
}

function persistSidebarColumnCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.sidebarColumnCollapsed, collapsed ? '1' : '0')
    localStorage.removeItem(LEGACY_APP_STORAGE_KEYS.sidebarColumnCollapsed)
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

/**
 * Tracks whether the primary sidebar is shown as the compact icon rail.
 */
export function useSidebarColumnCollapse() {
  const [sidebarColumnCollapsed, setSidebarColumnCollapsedState] = useState(loadSidebarColumnCollapsed)

  const setSidebarColumnCollapsed = useCallback((collapsed: boolean) => {
    setSidebarColumnCollapsedState(collapsed)
    persistSidebarColumnCollapsed(collapsed)
  }, [])

  return { sidebarColumnCollapsed, setSidebarColumnCollapsed }
}
