import { describe, expect, it } from 'vitest'
import { AI_AGENT_DEFINITIONS, createAiAgentAvailability, type AiAgentId } from './aiAgents'
import { GRAPH_AGENT_LANES, graphAgentLaneCopy, graphHandoffLaneLabel, resolveGraphAgentLaneState } from './graphAgentLanes'

describe('graph agent lanes', () => {
  it('uses real AI agent ids for graph handoff/private lanes', () => {
    const realAgentIds = new Set<AiAgentId>(AI_AGENT_DEFINITIONS.map((definition) => definition.id))
    const agentBackedLanes = GRAPH_AGENT_LANES.filter((lane) => lane.aiAgentId)

    expect(agentBackedLanes.map((lane) => lane.aiAgentId)).toEqual([
      'chitragupta',
      'codex',
      'claude_code',
    ])
    expect(agentBackedLanes.every((lane) => realAgentIds.has(lane.aiAgentId as AiAgentId))).toBe(true)
    expect(GRAPH_AGENT_LANES.map((lane) => lane.id)).not.toContain('claude')
  })

  it('builds the visible runway label from the shared handoff lanes', () => {
    expect(graphHandoffLaneLabel()).toBe('Codex / Claude Code')
  })

  it('uses installed/missing/checking agent status when source-safe policy allows a route', () => {
    const chitragupta = GRAPH_AGENT_LANES.find((lane) => lane.id === 'chitragupta')
    const codex = GRAPH_AGENT_LANES.find((lane) => lane.id === 'codex')
    const claude = GRAPH_AGENT_LANES.find((lane) => lane.id === 'claude_code')
    if (!chitragupta || !codex || !claude) throw new Error('Expected AI-backed graph lanes')
    const statuses = {
      chitragupta: createAiAgentAvailability('installed', '0.9.1'),
      codex: createAiAgentAvailability('missing'),
      claude_code: createAiAgentAvailability('checking'),
    }

    expect(resolveGraphAgentLaneState(chitragupta, 'ready', false, statuses)).toBe('guarded')
    expect(graphAgentLaneCopy(chitragupta, 'guarded', statuses)).toBe('MCP unverified')
    expect(resolveGraphAgentLaneState(codex, 'ready', false, statuses)).toBe('blocked')
    expect(graphAgentLaneCopy(codex, 'blocked', statuses)).toBe('Missing')
    expect(resolveGraphAgentLaneState(claude, 'ready', false, statuses)).toBe('waiting')
    expect(graphAgentLaneCopy(claude, 'waiting', statuses)).toBe('Checking')
  })

  it('makes Chitragupta MCP transport failures explicit in graph lanes', () => {
    const chitragupta = GRAPH_AGENT_LANES.find((lane) => lane.id === 'chitragupta')
    if (!chitragupta) throw new Error('Expected Chitragupta graph lane')
    const statuses = {
      chitragupta: createAiAgentAvailability('installed', '0.9.1'),
      codex: createAiAgentAvailability('installed'),
      claude_code: createAiAgentAvailability('installed'),
    }
    const transportClosed = {
      ok: false,
      daemon: 'running',
      transport: 'closed',
      capabilities: ['memory.search'],
      warnings: ['Transport closed at /Users/sriinnu/private.sock'],
    }

    expect(resolveGraphAgentLaneState(chitragupta, 'ready', false, statuses, transportClosed)).toBe('blocked')
    expect(graphAgentLaneCopy(chitragupta, 'blocked', statuses, { chitraguptaStatus: transportClosed })).toBe('MCP closed')
  })

  it('keeps Locality Firewall policy ahead of CLI availability for protected selections', () => {
    const codex = GRAPH_AGENT_LANES.find((lane) => lane.id === 'codex')
    const claude = GRAPH_AGENT_LANES.find((lane) => lane.id === 'claude_code')
    if (!codex || !claude) throw new Error('Expected handoff graph lanes')
    const statuses = {
      codex: createAiAgentAvailability('missing'),
      claude_code: createAiAgentAvailability('checking'),
    }

    expect(resolveGraphAgentLaneState(codex, 'ready', true, statuses)).toBe('blocked')
    expect(graphAgentLaneCopy(codex, 'blocked', statuses, true)).toBe('Blocked')
    expect(resolveGraphAgentLaneState(claude, 'ready', true, statuses)).toBe('blocked')
    expect(graphAgentLaneCopy(claude, 'blocked', statuses, true)).toBe('Blocked')
  })
})
