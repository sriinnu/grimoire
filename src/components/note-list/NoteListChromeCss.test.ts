import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('NoteListChrome CSS', () => {
  const css = [
    'NoteListChrome.css',
    'ProjectWorkspaceChrome.css',
    'NoteListFilterRail.css',
  ].map((file) => readFileSync(`${process.cwd()}/src/components/note-list/${file}`, 'utf8')).join('\n')

  it('keeps project and filter wrappers flat instead of nesting cards inside the pane', () => {
    const projectRule = css.match(/\.project-workspace-chrome\s*\{[^}]+\}/)?.[0] ?? ''
    const filterShelfRule = css.match(/\.note-list-filter-shelf\s*\{[^}]+\}/)?.[0] ?? ''
    const filterRailRule = css.match(/\.note-list-filter-rail\s*\{[^}]+\}/)?.[0] ?? ''
    const embeddedFilterRule = css.match(/\.note-list-filter-rail--embedded\s*\{[^}]+\}/)?.[0] ?? ''

    expect(projectRule).toContain('border: 0')
    expect(projectRule).toContain('background: transparent')
    expect(filterShelfRule).toContain('border: 0')
    expect(filterShelfRule).toContain('background: transparent')
    expect(filterRailRule).toContain('border-bottom')
    expect(embeddedFilterRule).toContain('border-bottom: 0')
    expect(embeddedFilterRule).toContain('background: transparent')
    expect(css).toContain('.note-list-top-chrome')
  })

  it('stacks project chrome controls in narrow sidebars instead of scattering the rail', () => {
    const narrowCss = css.slice(css.indexOf('@container (max-width: 320px)'))
    const narrowChromeRule = narrowCss.match(/\.project-workspace-chrome__overview\s*\{[^}]+\}/)?.[0] ?? ''
    const narrowScopeRule = narrowCss.match(/\.project-workspace-chrome__scope\s*\{[^}]+\}/)?.[0] ?? ''
    const filterShelfRule = css.match(/\.note-list-filter-shelf\s*\{[^}]+\}/)?.[0] ?? ''

    expect(css).toContain('@container (max-width: 320px)')
    expect(narrowChromeRule).toContain('grid-template-columns: 1fr')
    expect(narrowScopeRule).toContain('grid-template-columns: auto minmax(0, 1fr)')
    expect(filterShelfRule).toContain('flex-wrap: nowrap')
    expect(filterShelfRule).toContain('overflow-x: auto')
  })

  it('keeps project scope, metrics, and actions in a stable cockpit before search/docs', () => {
    const overviewRule = css.match(/\.project-workspace-chrome__overview\s*\{[^}]+\}/)?.[0] ?? ''
    const scopeRule = css.match(/\.project-workspace-chrome__scope\s*\{[^}]+\}/)?.[0] ?? ''
    const scopePartRule = css.match(/\.project-workspace-chrome__scope-part\s*\{[^}]+\}/)?.[0] ?? ''
    const metricsRule = css.match(/\.project-workspace-chrome__metrics\s*\{[^}]+\}/)?.[0] ?? ''
    const metricRule = css.match(/\.project-workspace-chrome__metric\s*\{[^}]+\}/)?.[0] ?? ''
    const actionsRule = css.match(/\.project-workspace-chrome__actions\s*\{[^}]+\}/)?.[0] ?? ''
    const docsScrollRules = [...css.matchAll(/\.project-workspace-chrome__docs-scroll\s*\{[^}]+\}/g)]
      .map((match) => match[0])
      .join('\n')
    const filtersRule = css.match(/\.project-workspace-chrome__filters\s*\{[^}]+\}/)?.[0] ?? ''
    const docsRule = css.match(/\.project-workspace-chrome__docs\s*\{[^}]+\}/)?.[0] ?? ''

    expect(overviewRule).toContain('grid-template-areas')
    expect(overviewRule.indexOf('"search search"')).toBeLessThan(overviewRule.indexOf('"docs docs"'))
    expect(scopeRule).toContain('grid-area: scope')
    expect(scopeRule).toContain('grid-template-areas')
    expect(scopePartRule).toContain('overflow: hidden')
    expect(scopePartRule).toContain('text-overflow: ellipsis')
    expect(metricsRule).toContain('grid-area: metrics')
    expect(metricsRule).toContain('justify-content: flex-start')
    expect(metricRule).toContain('font-variant-numeric: tabular-nums')
    expect(css).toContain('.project-workspace-chrome__metric[data-state="primary"]')
    expect(css).toContain('.project-workspace-chrome__metric[data-state="warning"]')
    expect(actionsRule).toContain('grid-area: actions')
    expect(css).toContain('.project-workspace-chrome__action[data-state="saved"]')
    expect(css).toContain('grid-area: docs')
    expect(docsRule).toContain('border-top')
    expect(docsRule).toContain('background: transparent')
    expect(docsScrollRules).toContain('mask-image')
    expect(filtersRule).toContain('grid-area: filters')
    expect(filtersRule).toContain('border: 0')
    expect(filtersRule).toContain('background: transparent')
    expect(css).toContain('.note-list-filter-rail--embedded .note-list-filter-group')
  })

  it('keeps note-list header actions in the same chrome control language', () => {
    const actionsRule = css.match(/\.note-list-chrome-actions\s*\{[^}]+\}/)?.[0] ?? ''
    const actionRule = css.match(/\.note-list-chrome-action\s*\{[^}]+\}/)?.[0] ?? ''
    const actionOpenRule = css.match(/\.note-list-chrome-action:hover,[^}]+\.note-list-chrome-action\[aria-expanded="true"\]\s*\{[^}]+\}/)?.[0] ?? ''

    expect(actionsRule).toContain('border: 1px solid var(--note-list-chrome-border)')
    expect(actionsRule).toContain('border-radius: 999px')
    expect(actionRule).toContain('color: var(--note-list-chrome-muted)')
    expect(actionRule).toContain('border-radius: 999px')
    expect(actionOpenRule).toContain('color: var(--foreground)')
    expect(css).not.toContain('sort-button-__list__')
  })

  it('uses solid scoped muted text for tiny center-pane chrome labels', () => {
    expect(css).toContain('--note-list-chrome-muted: var(--muted-foreground)')
    expect(css).not.toContain('--note-list-chrome-muted: color-mix')
    expect(css).toContain('color: var(--note-list-chrome-muted)')
    expect(css).toContain('min-width: 3.7rem')
    expect(css).toContain('min-width: 4.9rem')
    expect(css).toContain('white-space: nowrap')
  })

  it('renders selected notes with an inset aurora instead of a hard left border', () => {
    expect(css).toContain('[data-note-path][data-selected="true"]::before')
    expect(css).toContain('[data-note-path][data-selected="true"]::after')
    expect(css).toContain('linear-gradient(')
    expect(css).toContain('radial-gradient(')
    expect(css).toContain('top: 10px')
    expect(css).toContain('height: 3px')
    expect(css).toContain('pointer-events: none')
    expect(css).not.toContain('left: 10px')
    expect(css).not.toContain('width: 4px')
    expect(css).not.toContain('border-l-[3px]')
  })
})
