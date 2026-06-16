import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { GraphAgentPackagePanel } from './GraphAgentPackagePanel'

const readyContext: AgentGraphContext = {
  edges: [{
    kind: 'body-link',
    label: 'Wikilink',
    sourcePath: '/vault/alpha.md',
    sourceTitle: 'Alpha',
    targetPath: '/vault/beta.md',
    targetTitle: 'Beta',
  }],
  nodes: [
    { active: true, degree: 1, path: '/vault/alpha.md', title: 'Alpha', type: 'Note' },
    { active: false, degree: 1, path: '/vault/beta.md', title: 'Beta', type: 'Note' },
  ],
  omitted: { protectedEdges: 1, protectedNodes: 1, truncatedEdges: 0, truncatedNodes: 0 },
  state: 'ready',
  totals: { visibleEdges: 1, visibleNodes: 2 },
}

describe('GraphAgentPackagePanel', () => {
  it('marks source-safe and held-local package facts with theme-addressable states', () => {
    render(<GraphAgentPackagePanel agentGraphContext={readyContext} />)

    const handoff = screen.getByTestId('graph-agent-handoff')
    const envelope = screen.getByTestId('graph-agent-package-envelope')
    expect(handoff).toHaveAttribute('data-state', 'ready')
    expect(envelope).toHaveTextContent('Source preview')
    expect(envelope).toHaveTextContent('2 shown / 2 total')
    expect(envelope).toHaveTextContent('Held local')
    expect(envelope.querySelector('.graph-agent-package__metric[data-state="guarded"]')).not.toBeNull()
    expect(handoff.querySelectorAll('.graph-agent-chip[data-state="ready"]')).toHaveLength(6)
    expect(handoff.querySelectorAll('.graph-agent-chip[data-state="guarded"]')).toHaveLength(1)
    expect(handoff.querySelectorAll('.graph-agent-card[data-state="ready"]')).toHaveLength(2)
    expect(handoff).toHaveTextContent('2 held by Locality Firewall')
  })

  it('keeps protected-active packages visually blocked without exposing labels', () => {
    render(<GraphAgentPackagePanel agentGraphContext={{ ...readyContext, edges: [], nodes: [], state: 'protected-active' }} />)

    const handoff = screen.getByTestId('graph-agent-handoff')
    const envelope = screen.getByTestId('graph-agent-package-envelope')
    expect(handoff).toHaveAttribute('data-state', 'blocked')
    expect(envelope).toHaveTextContent('0 shown / 0 total')
    expect(handoff.querySelector('.graph-agent-chip[data-state="blocked"]')).not.toBeNull()
    expect(handoff.querySelectorAll('.graph-agent-card[data-state="waiting"]')).toHaveLength(2)
    expect(handoff).toHaveTextContent('No source labels ready.')
    expect(handoff).not.toHaveTextContent('Alpha')
  })

  it('disambiguates duplicate source labels and edge manifests by path', () => {
    render(<GraphAgentPackagePanel agentGraphContext={{
      edges: [{
        kind: 'body-link',
        label: 'Wikilink',
        sourcePath: '/vault/projects/index.md',
        sourceTitle: 'Index',
        targetPath: '/vault/archive/index.md',
        targetTitle: 'Index',
      }],
      nodes: [
        { active: true, degree: 1, path: '/vault/projects/index.md', title: 'Index', type: 'Note' },
        { active: false, degree: 1, path: '/vault/archive/index.md', title: 'Index', type: 'Note' },
      ],
      omitted: { protectedEdges: 0, protectedNodes: 0, truncatedEdges: 0, truncatedNodes: 0 },
      state: 'ready',
      totals: { visibleEdges: 1, visibleNodes: 2 },
    }} />)

    const manifest = screen.getByTestId('graph-package-manifest')
    expect(manifest).toHaveTextContent('Index - projects/index.md')
    expect(manifest).toHaveTextContent('Index - archive/index.md')
    expect(manifest).toHaveTextContent('Index - projects/index.md -> Index - archive/index.md')
  })

  it('keeps duplicate visible edge labels on stable React keys', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<GraphAgentPackagePanel agentGraphContext={{
      edges: [
        {
          kind: 'body-link',
          label: 'Wikilink',
          sourcePath: '/vault/build-grimoire-app.md',
          sourceTitle: 'Build Grimoire App',
          targetPath: '/vault/software-development.md',
          targetTitle: 'Software Development',
        },
        {
          kind: 'frontmatter',
          label: 'belongs_to',
          sourcePath: '/vault/build-grimoire-app.md',
          sourceTitle: 'Build Grimoire App',
          targetPath: '/vault/software-development.md',
          targetTitle: 'Software Development',
        },
      ],
      nodes: [
        { active: true, degree: 2, path: '/vault/build-grimoire-app.md', title: 'Build Grimoire App', type: 'Project' },
        { active: false, degree: 2, path: '/vault/software-development.md', title: 'Software Development', type: 'Area' },
      ],
      omitted: { protectedEdges: 0, protectedNodes: 0, truncatedEdges: 0, truncatedNodes: 0 },
      state: 'ready',
      totals: { visibleEdges: 2, visibleNodes: 2 },
    }} />)

    const duplicateKeyWarning = consoleError.mock.calls.some((call) =>
      call.some((value) => String(value).includes('same key'))
    )
    expect(duplicateKeyWarning).toBe(false)
    consoleError.mockRestore()
  })
})
