import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('app scrollbar styling', () => {
  const appCss = readFileSync(`${process.cwd()}/src/App.css`, 'utf8')
  const scrollAreaSource = readFileSync(
    `${process.cwd()}/src/components/ui/scroll-area.tsx`,
    'utf8',
  )

  it('keeps native scrollbars slim but still visible on hover', () => {
    expect(appCss).toContain('--grimoire-scrollbar-size: 6px')
    expect(appCss).toContain('.app-shell *')
    expect(appCss).toContain('scrollbar-width: thin')
    expect(appCss).toContain('.app-shell *::-webkit-scrollbar')
    expect(appCss).toContain('background: var(--grimoire-scrollbar-thumb-hover)')
  })

  it('uses the slim size for Radix scroll areas too', () => {
    expect(scrollAreaSource).toContain('"h-full w-1.5 border-l border-l-transparent"')
    expect(scrollAreaSource).toContain('"h-1.5 flex-col border-t border-t-transparent"')
    expect(scrollAreaSource).toContain('bg-border/75 hover:bg-border')
  })

  it('collapses desktop chrome instead of squeezing the notebook at narrow widths', () => {
    expect(appCss).toContain('@media (max-width: 720px)')
    expect(appCss).toContain('.app__sidebar {\n    display: none;')
    expect(appCss).toContain('.app__note-list,\n  .app__editor,\n  .app__dashboard')
    expect(appCss).toContain('min-width: 0')
  })
})
