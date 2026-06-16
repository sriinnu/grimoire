export interface TypeIconImageOption {
  id: string
  label: string
  value: string
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

interface TypeMarkDefinition {
  accent: string
  id: string
  label: string
  mark: string
  secondary?: string
}

function typeMarkSvg(accent: string, mark: string, secondary = '#ffffff'): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '<defs>',
    `<linearGradient id="g" x1="10" x2="54" y1="6" y2="58"><stop stop-color="${secondary}" stop-opacity=".28"/><stop offset="1" stop-color="${accent}"/></linearGradient>`,
    '</defs>',
    `<rect width="64" height="64" rx="14" fill="${accent}"/>`,
    '<path d="M10 52C18 39 29 35 54 42v12H10Z" fill="url(#g)" opacity=".88"/>',
    '<circle cx="47" cy="17" r="8" fill="white" opacity=".22"/>',
    `<path d="${mark}" fill="none" stroke="white" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
  ].join('')
}

const BUILT_IN_MARKS: TypeMarkDefinition[] = [
  {
    id: 'journal-mark',
    label: 'Journal mark',
    accent: '#2563eb',
    secondary: '#93c5fd',
    mark: 'M20 18h20a6 6 0 0 1 6 6v24H24a6 6 0 0 1-6-6V20a2 2 0 0 1 2-2Z',
  },
  {
    id: 'canvas-mark',
    label: 'Canvas mark',
    accent: '#7c3aed',
    secondary: '#c4b5fd',
    mark: 'M18 43c8-18 14 9 22-8 3-6 5-10 9-14',
  },
  {
    id: 'research-mark',
    label: 'Research mark',
    accent: '#047857',
    secondary: '#6ee7b7',
    mark: 'M20 22h24M20 32h14M20 42h20',
  },
  {
    id: 'memory-mark',
    label: 'Memory mark',
    accent: '#c2410c',
    secondary: '#fdba74',
    mark: 'M22 34a10 10 0 1 1 20 0v10H22V34Z M30 44v6',
  },
  { id: 'link-mark', label: 'Link mark', accent: '#0f766e', secondary: '#5eead4', mark: 'M22 32h20M28 24l-8 8 8 8M36 24l8 8-8 8' },
  { id: 'graph-mark', label: 'Graph mark', accent: '#4338ca', secondary: '#a5b4fc', mark: 'M20 22l14 9 10-12M34 31l10 15M34 31L20 44M20 22v22M44 19v27' },
  { id: 'entry-mark', label: 'Entry mark', accent: '#be123c', secondary: '#fda4af', mark: 'M22 46V20h20v26M30 46V28h12M36 37h1' },
  { id: 'atlas-map-mark', label: 'Map mark', accent: '#0369a1', secondary: '#7dd3fc', mark: 'M18 20l11-5 17 5v29l-17-5-11 5V20Zm11-5v29M46 20v29' },
  { id: 'idea-mark', label: 'Idea mark', accent: '#ca8a04', secondary: '#fde68a', mark: 'M22 21h20v17H31l-9 8V21Zm8 8h10M30 36h7' },
  { id: 'signal-mark', label: 'Signal mark', accent: '#15803d', secondary: '#86efac', mark: 'M20 42h4M30 42h4V30h-4v12Zm10 0h4V22h-4v20Z' },
  { id: 'spectrum-mark', label: 'Spectrum mark', accent: '#6d28d9', secondary: '#f0abfc', mark: 'M32 16l16 30H16L32 16Zm0 0v30M20 46l12-30 12 30' },
  { id: 'loop-mark', label: 'Loop mark', accent: '#0e7490', secondary: '#67e8f9', mark: 'M20 32c0-8 24-8 24 0s-24 8-24 0Zm12-12c8 0 8 24 0 24s-8-24 0-24Z' },
  { id: 'method-mark', label: 'Method mark', accent: '#4d7c0f', secondary: '#bef264', mark: 'M22 20h20M22 32h20M22 44h20M28 20v24M36 20v24' },
  { id: 'practice-mark', label: 'Practice mark', accent: '#a21caf', secondary: '#f5d0fe', mark: 'M32 16v32M20 28c8 6 16 6 24 0M22 42c7-5 13-5 20 0' },
  { id: 'timeline-mark', label: 'Timeline mark', accent: '#b45309', secondary: '#fcd34d', mark: 'M20 20v24M32 20v24M44 20v24M20 26h24M20 38h24' },
  { id: 'place-mark', label: 'Place mark', accent: '#166534', secondary: '#bbf7d0', mark: 'M32 47s12-12 12-21a12 12 0 0 0-24 0c0 9 12 21 12 21Zm0-25a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z' },
  { id: 'task-mark', label: 'Task mark', accent: '#1d4ed8', secondary: '#bfdbfe', mark: 'M20 23l5 5 9-10M20 39l5 5 17-19' },
  { id: 'note-mark', label: 'Note mark', accent: '#e11d48', secondary: '#fecdd3', mark: 'M32 17a11 11 0 0 0-7 20v5h14v-5a11 11 0 0 0-7-20Zm-6 31h12' },
  { id: 'archive-mark', label: 'Archive mark', accent: '#475569', secondary: '#cbd5e1', mark: 'M20 24h24v24H20V24Zm-3-7h30v7H17v-7Zm10 19h10' },
  { id: 'craft-mark', label: 'Craft mark', accent: '#db2777', secondary: '#fbcfe8', mark: 'M22 43l4-12 16-16 8 8-16 16-12 4ZM38 19l7 7' },
]

/** Built-in image marks for custom types, stored as portable SVG data URLs. */
export const TYPE_ICON_IMAGE_OPTIONS: TypeIconImageOption[] = BUILT_IN_MARKS.map((typeMark) => ({
  id: typeMark.id,
  label: typeMark.label,
  value: svgDataUri(typeMarkSvg(typeMark.accent, typeMark.mark, typeMark.secondary)),
}))
