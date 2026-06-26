// Build identity, baked in at compile time by vite.config.ts `define`. Lets the
// running app state precisely which frontend bundle it is — version + build
// time + short git SHA — so "which build am I on?" is a fact, not a guess.
declare const __APP_VERSION__: string | undefined
declare const __BUILD_TIME__: string | undefined
declare const __GIT_SHA__: string | undefined

const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev'
const builtAtIso = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''
const sha = typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__ : 'dev'

export const BUILD_INFO = { version, builtAtIso, sha } as const

/** Compact glanceable stamp, e.g. "0.1.435 · Jun 19, 22:55 · 1086ac8". */
export function formatBuildStamp(): string {
  const when = formatBuiltAt()
  return [`v${version}`, when, sha].filter(Boolean).join(' · ')
}

/** Human build time in the local zone, or '' when unknown. */
export function formatBuiltAt(): string {
  if (!builtAtIso) return ''
  const date = new Date(builtAtIso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
