import { useCallback, useState } from 'react'
import { APP_STORAGE_KEYS } from '../../constants/appStorage'

export type InspectorSectionId = 'about' | 'connections' | 'history' | 'details'

export const INSPECTOR_SECTION_DEFAULTS: Record<InspectorSectionId, boolean> = {
  about: true,
  connections: true,
  history: false,
  details: false,
}

type SectionOpenState = Partial<Record<InspectorSectionId, boolean>>

function readSectionState(): SectionOpenState {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEYS.inspectorSections)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as SectionOpenState) : {}
  } catch {
    return {}
  }
}

function writeSectionState(id: InspectorSectionId, open: boolean): void {
  try {
    const next = { ...readSectionState(), [id]: open }
    localStorage.setItem(APP_STORAGE_KEYS.inspectorSections, JSON.stringify(next))
  } catch {
    // Storage may be unavailable; the in-memory state still applies.
  }
}

/** Persisted open state for one section, falling back to the section's default. */
export function useInspectorSectionOpen(id: InspectorSectionId): [boolean, () => void, (next: boolean) => void] {
  const [open, setOpen] = useState(() => readSectionState()[id] ?? INSPECTOR_SECTION_DEFAULTS[id])
  const toggle = useCallback(() => {
    setOpen((current) => {
      const next = !current
      writeSectionState(id, next)
      return next
    })
  }, [id])
  const set = useCallback((next: boolean) => {
    setOpen(next)
    writeSectionState(id, next)
  }, [id])
  return [open, toggle, set]
}

/** Test seam: forget persisted section state between tests. */
export function resetInspectorSectionStateForTests(): void {
  try {
    localStorage.removeItem(APP_STORAGE_KEYS.inspectorSections)
  } catch {
    // ignore
  }
}
