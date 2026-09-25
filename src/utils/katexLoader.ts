/**
 * KaTeX on demand. It's ~250KB of JS plus ~24KB CSS that used to ride along
 * with every note open (and every session restore), while most notes have no
 * math at all. The first math node asks for it; everything after is sync.
 */
type Katex = typeof import('katex')['default']

let katex: Katex | null = null
let pending: Promise<Katex> | null = null

export function getLoadedKatex(): Katex | null {
  return katex
}

export function loadKatex(): Promise<Katex> {
  if (katex) return Promise.resolve(katex)
  pending ??= Promise.all([
    import('katex'),
    import('katex/dist/katex.min.css'),
  ]).then(([module]) => {
    katex = module.default
    return katex
  })
  return pending
}
