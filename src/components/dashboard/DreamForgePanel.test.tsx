import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { buildDreamForgePrivacyReport, buildDreamForgeSummary } from '../../lib/dreamForge'
import { DreamForgePanel } from './DreamForgePanel'

function entry(title: string, type: string, patch: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: `/vault/private/${title.toLowerCase().replace(/\s+/g, '-')}.md`,
    filename: `${title}.md`,
    title,
    isA: type,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: patch.modifiedAt ?? 1,
    createdAt: patch.createdAt ?? 1,
    fileSize: 0,
    snippet: 'private body should not render',
    wordCount: 1,
    relationships: patch.relationships ?? {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: patch.properties ?? {},
    hasH1: true,
    fileKind: 'markdown',
    ...patch,
  }
}

describe('DreamForgePanel', () => {
  it('renders a private timeline from counts without title, path, or body leakage', () => {
    const day = 24 * 60 * 60
    const now = 50 * day
    const entries = [
      entry('Night River Secret', 'Dream', { modifiedAt: now - 40, properties: { symbols: 'river' } }),
      entry('Week Door Private', 'Journal', { modifiedAt: now - 2 * day, properties: { feeling: 'calm' } }),
      entry('Month Mountain Hidden', 'Dream', { modifiedAt: now - 14 * day, properties: { symbols: 'mountain' } }),
      entry('Archive Ocean Locked', 'Dream', { modifiedAt: now - 35 * day, properties: { symbols: 'ocean' } }),
    ]

    render(
      <DreamForgePanel
        privacyReport={buildDreamForgePrivacyReport(entries)}
        summary={buildDreamForgeSummary(entries, now)}
        onCaptureDream={vi.fn()}
      />,
    )

    const timeline = screen.getByTestId('dream-forge-timeline')
    expect(timeline).toHaveAccessibleName('Private dream timeline')
    for (const text of ['Last night', 'This week', 'This month', 'Deep archive', 'signals', 'held']) {
      expect(timeline).toHaveTextContent(text)
    }
    expect(within(timeline).getByText('Deep archive').closest('[data-state]')).toHaveAttribute('data-state', 'archive')
    const payload = timeline.textContent ?? ''
    expect(payload).not.toContain('Night River Secret')
    expect(payload).not.toContain('/vault/private')
    expect(payload).not.toContain('private body')
  })
})
