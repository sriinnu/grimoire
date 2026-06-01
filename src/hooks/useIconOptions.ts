import { useCallback, useEffect, useRef, useState } from 'react'
import { COMMON_ICON_OPTIONS, loadIconOptions, type IconEntry } from '../utils/iconRegistry'

interface IconOptionsState {
  ensureFullCatalog: () => void
  fullCatalogLoaded: boolean
  iconOptions: IconEntry[]
  iconsLoaded: boolean
  isFullCatalogLoading: boolean
}

/** Shows common icons immediately and loads the full picker catalog only on demand. */
export function useIconOptions(): IconOptionsState {
  const [iconOptions, setIconOptions] = useState<IconEntry[]>(() => COMMON_ICON_OPTIONS)
  const [fullCatalogLoaded, setFullCatalogLoaded] = useState(false)
  const [isFullCatalogLoading, setIsFullCatalogLoading] = useState(false)
  const mountedRef = useRef(true)
  const requestRef = useRef<Promise<IconEntry[]> | null>(null)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const ensureFullCatalog = useCallback(() => {
    if (fullCatalogLoaded) return
    requestRef.current ??= loadIconOptions()
    setIsFullCatalogLoading(true)
    void requestRef.current
      .then((options) => {
        if (!mountedRef.current) return
        setIconOptions(options)
        setFullCatalogLoaded(true)
      })
      .finally(() => {
        if (mountedRef.current) setIsFullCatalogLoading(false)
      })
  }, [fullCatalogLoaded])

  return {
    ensureFullCatalog,
    fullCatalogLoaded,
    iconOptions,
    iconsLoaded: true,
    isFullCatalogLoading,
  }
}
