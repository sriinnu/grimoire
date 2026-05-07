export interface TypeIconImageOption {
  id: string
  label: string
  value: string
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function badgeSvg(accent: string, mark: string): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    `<rect width="64" height="64" rx="14" fill="${accent}"/>`,
    '<circle cx="47" cy="17" r="8" fill="white" opacity=".24"/>',
    `<path d="${mark}" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
  ].join('')
}

/** Built-in image badges for custom types, stored as portable SVG data URLs. */
export const TYPE_ICON_IMAGE_OPTIONS: TypeIconImageOption[] = [
  {
    id: 'journal-badge',
    label: 'Journal badge',
    value: svgDataUri(badgeSvg('#2563eb', 'M20 18h20a6 6 0 0 1 6 6v24H24a6 6 0 0 1-6-6V20a2 2 0 0 1 2-2Z')),
  },
  {
    id: 'canvas-badge',
    label: 'Canvas badge',
    value: svgDataUri(badgeSvg('#7c3aed', 'M18 43c8-18 14 9 22-8 3-6 5-10 9-14')),
  },
  {
    id: 'research-badge',
    label: 'Research badge',
    value: svgDataUri(badgeSvg('#047857', 'M20 22h24M20 32h14M20 42h20')),
  },
  {
    id: 'memory-badge',
    label: 'Memory badge',
    value: svgDataUri(badgeSvg('#c2410c', 'M22 34a10 10 0 1 1 20 0v10H22V34Z M30 44v6')),
  },
]
