export interface FixedMenuBounds {
  width: number
  height: number
  gap?: number
}

const DEFAULT_MENU_GAP = 8

/** Keeps custom fixed-position menus inside the visible viewport. */
export function clampFixedMenuPosition(
  x: number,
  y: number,
  bounds: FixedMenuBounds,
): { left: number; top: number } {
  if (typeof window === 'undefined') return { left: x, top: y }

  const gap = bounds.gap ?? DEFAULT_MENU_GAP
  const maxLeft = Math.max(gap, window.innerWidth - bounds.width - gap)
  const maxTop = Math.max(gap, window.innerHeight - bounds.height - gap)

  return {
    left: Math.max(gap, Math.min(x, maxLeft)),
    top: Math.max(gap, Math.min(y, maxTop)),
  }
}
