import { GLYPH_MARKUP, type GlyphName } from './glyphData'

export type { GlyphName }

export interface GlyphProps {
  /** Grimoire glyph name (e.g. "home", "graph", "chitragupta"). */
  name: GlyphName
  /** Rendered size in px (square). Defaults to 18. */
  size?: number
  className?: string
  /**
   * Accessible label. When provided the glyph is exposed as an image with this
   * name; otherwise it is hidden from assistive tech (decorative / labelled by
   * an adjacent text node).
   */
  label?: string
  style?: React.CSSProperties
}

/**
 * Renders a Grimoire custom glyph from the generated registry. Glyphs are
 * stroke-based on a 64×64 grid and tint with the current text `color`, so they
 * adapt across Light, Dark, and Retro themes without per-mode assets.
 */
export function Glyph({ name, size = 18, className, label, style }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      // The registry markup is build-time generated from trusted local SVG
      // sources (see scripts/generate-glyphs.mjs), never user input.
      dangerouslySetInnerHTML={{ __html: GLYPH_MARKUP[name] }}
    />
  )
}
