import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const semanticsCss = readFileSync(resolve(root, 'src/icon-semantics.css'), 'utf8')
const mainSource = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')

describe('semantic icon language', () => {
  it('defines the same named intents from theme tokens rather than light-only colours', () => {
    for (const intent of ['navigation', 'capture', 'structure', 'safe', 'ai', 'code', 'favorite', 'danger', 'neutral']) {
      expect(semanticsCss).toContain(`--icon-intent-${intent}`)
      expect(semanticsCss).toContain(`[data-icon-intent='${intent}']`)
    }
    expect(semanticsCss).not.toMatch(/#[0-9a-f]{3,8}\b/iu)
  })

  it('loads after the sidebar art layers so semantic colour wins in both themes', () => {
    // The sidebar art layers moved from main.tsx into Sidebar.tsx (which
    // main.tsx pulls in via the App import), so the cascade contract is now:
    // App import (sidebar art) precedes the icon-semantics layer at boot.
    expect(mainSource.indexOf("import './icon-semantics.css'")).toBeGreaterThan(
      mainSource.indexOf("import App from './App.tsx'"),
    )
    const sidebarSource = readFileSync(resolve(root, 'src/components/Sidebar.tsx'), 'utf8')
    expect(sidebarSource).toContain("import '../sidebar-artwork-polish.css'")
  })

  it('gives each primary navigation family a stable colour role', () => {
    for (const tone of ['aura', 'amber', 'blue', 'violet', 'neutral']) {
      expect(semanticsCss).toContain(`data-sidebar-nav-tone='${tone}'`)
      expect(semanticsCss).toContain(`data-sidebar-rail-tone='${tone}'`)
    }
  })
})
