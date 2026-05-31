import { describe, expect, it } from 'vitest'
import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../types'
import {
  REQUIRED_CHITRAGUPTA_CAPABILITIES,
  buildChitraguptaMemoryContext,
  evaluateChitraguptaContractStatus,
  summarizeChitraguptaRuntimeReadiness,
} from './chitraguptaIntegration'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: '/vault/project.md',
    filename: 'project.md',
    title: 'Project',
    isA: 'Project',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
    fileSize: 10,
    snippet: '',
    wordCount: 0,
    relationships: {},
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
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
    ...overrides,
  }
}

const semantics: MarkdownDocumentSemantics = {
  frontmatterState: 'valid',
  frontmatterRaw: 'title: Project',
  frontmatterFields: [{ key: 'title', value: 'Project' }],
  body: '# Project',
  bodyStartLine: 3,
  headings: [{ level: 1, text: 'Project', slug: 'project', line: 3 }],
}

describe('chitraguptaIntegration', () => {
  it('marks the contract ready only when daemon health and required capabilities are present', () => {
    const status = evaluateChitraguptaContractStatus({
      ok: true,
      daemon: 'running',
      capabilities: REQUIRED_CHITRAGUPTA_CAPABILITIES,
      warnings: [],
    })

    expect(status.state).toBe('ready')
    expect(status.daemon).toBe('running')
    expect(status.missingCapabilities).toEqual([])
    expect(status.capabilities.every(capability => capability.available)).toBe(true)
  })

  it('blocks live memory UX when Chitragupta exposes only health-level tools', () => {
    const status = evaluateChitraguptaContractStatus({
      ok: true,
      daemon: 'running',
      capabilities: ['health.status', 'memory.search'],
      warnings: ['Project access denied'],
    })

    expect(status.state).toBe('blocked')
    expect(status.warnings).toContain('Project access denied')
    expect(status.warnings).toContain('Missing Chitragupta capabilities: memory.append, recall.unified, wiki.list, wiki.read, graph.neighborhood, diagnostics.memory, ingest.markdown')
    expect(status.missingCapabilities).toEqual([
      'memory.append',
      'recall.unified',
      'wiki.list',
      'wiki.read',
      'graph.neighborhood',
      'diagnostics.memory',
      'ingest.markdown',
    ])
  })

  it('fails closed when Chitragupta status is unavailable', () => {
    const status = evaluateChitraguptaContractStatus(null)

    expect(status.state).toBe('blocked')
    expect(status.daemon).toBe('unknown')
    expect(status.warnings).toContain('Chitragupta status is unavailable.')
    expect(status.missingCapabilities).toEqual(REQUIRED_CHITRAGUPTA_CAPABILITIES)
  })

  it('sanitizes runtime warnings before they reach product UI', () => {
    const status = evaluateChitraguptaContractStatus({
      ok: false,
      daemon: 'stopped',
      capabilities: [],
      warnings: [
        'failed for /Users/srinivaspendela/private/vault.md token=secret-token srinivas@example.com',
      ],
    })

    expect(status.warnings[0]).toContain('[local path withheld]')
    expect(status.warnings[0]).toContain('token=[redacted]')
    expect(status.warnings[0]).toContain('[email withheld]')
    expect(status.warnings[0]).not.toContain('/Users/srinivaspendela')
    expect(status.warnings[0]).not.toContain('secret-token')
    expect(status.warnings[0]).not.toContain('srinivas@example.com')
  })

  it('separates installed CLI chat from unverified MCP memory readiness', () => {
    const contractStatus = evaluateChitraguptaContractStatus(null)
    const diagnostic = summarizeChitraguptaRuntimeReadiness({
      availability: { status: 'installed', version: '0.1.0' },
      contractStatus,
      protectedNote: false,
    })

    expect(diagnostic.state).toBe('mcp_unverified')
    expect(diagnostic.cliLabel).toBe('CLI installed')
    expect(diagnostic.contractLabel).toBe('MCP contract unverified')
    expect(diagnostic.capabilityLabel).toBe('0/8 MCP capabilities')
    expect(diagnostic.warnings[0]).toContain('CLI chat can run separately')
  })

  it('treats closed MCP transport as a separate fail-closed Chitragupta state', () => {
    const contractStatus = evaluateChitraguptaContractStatus({
      ok: false,
      daemon: 'running',
      warnings: ['tool call failed for /Users/srinivaspendela/vault.md: Transport closed'],
      capabilities: REQUIRED_CHITRAGUPTA_CAPABILITIES,
    })
    const diagnostic = summarizeChitraguptaRuntimeReadiness({
      availability: { status: 'installed', version: '0.1.0' },
      contractStatus,
      protectedNote: false,
    })

    expect(contractStatus.state).toBe('blocked')
    expect(contractStatus.transport).toBe('closed')
    expect(contractStatus.warnings).toContain('Chitragupta MCP transport is closed.')
    expect(contractStatus.warnings.join(' ')).not.toContain('/Users/srinivaspendela')
    expect(diagnostic.state).toBe('mcp_transport_closed')
    expect(diagnostic.contractLabel).toBe('MCP transport closed')
    expect(diagnostic.warnings[0]).toContain('MCP transport closed')
  })

  it('builds source-backed active note context for memory recall', () => {
    const active = entry({
      outgoingLinks: ['Decision Log'],
      relatedTo: ['[[Research]]'],
    })
    const context = buildChitraguptaMemoryContext(active, [
      active,
      entry({ title: 'Decision Log', path: '/vault/decision-log.md' }),
      entry({ title: 'Research', path: '/vault/research.md' }),
    ], semantics)

    expect(context.activeNotePath).toBe('/vault/project.md')
    expect(context.headingCount).toBe(1)
    expect(context.frontmatterFieldCount).toBe(1)
    expect(context.outgoingLinks).toEqual(['Decision Log'])
    expect(context.relatedTitles).toEqual(['Decision Log', 'Research'])
    expect(context.locality.localOnly).toBe(false)
    expect(context.locality.badgeLabel).toBe('Vault context')
    expect(context.requiredCapabilities).toContain('recall.unified')
    expect(context.requiredCapabilities).toContain('graph.neighborhood')
  })

  it('redacts local-only active note metadata before memory handoff', () => {
    const active = entry({
      path: '/vault/Dreams/secret.md',
      title: 'Secret Dream',
      isA: 'Dream',
      outgoingLinks: ['Private Thought'],
      properties: { local_only: true },
    })
    const context = buildChitraguptaMemoryContext(active, [
      active,
      entry({ title: 'Private Thought', path: '/vault/private-thought.md' }),
    ], semantics)

    expect(context.activeNotePath).toBe('[local-only path withheld]')
    expect(context.title).toBe('[local-only title withheld]')
    expect(context.headingCount).toBe(0)
    expect(context.frontmatterFieldCount).toBe(0)
    expect(context.outgoingLinks).toEqual([])
    expect(context.relatedTitles).toEqual([])
    expect(context.locality).toEqual({
      localOnly: true,
      source: 'none',
      reason: 'Local-only marker present',
      badgeLabel: 'Local-only',
    })
  })

  it('omits local-only related note titles from public note memory context', () => {
    const active = entry({
      outgoingLinks: ['Private Thought', 'Decision Log'],
    })
    const context = buildChitraguptaMemoryContext(active, [
      active,
      entry({ title: 'Private Thought', path: '/vault/Private/thought.md' }),
      entry({ title: 'Decision Log', path: '/vault/decision-log.md' }),
    ], semantics)

    expect(context.relatedTitles).toEqual(['Decision Log'])
    expect(context.outgoingLinks).toEqual(['Decision Log'])
  })
})
