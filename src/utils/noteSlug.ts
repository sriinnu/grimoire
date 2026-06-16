const WINDOWS_RESERVED_DEVICE_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

function avoidWindowsReservedStem(stem: string): string {
  return WINDOWS_RESERVED_DEVICE_NAMES.has(stem.toLocaleUpperCase()) ? `${stem}-note` : stem
}

// Shared title-to-stem slugging keeps frontend rename and wikilink behavior
// aligned with the backend rename pipeline.
export function slugifyNoteStem(text: string): string {
  const result = text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/(^-|-$)/g, '')
  return avoidWindowsReservedStem(result || 'untitled')
}
