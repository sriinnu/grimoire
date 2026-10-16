/**
 * Design Lab mock data — realistic demo content for the envisioned surfaces.
 * Dev-only; consumed by the #design-lab route artifacts.
 */

export type LabTheme = 'light' | 'dark'

export interface GraphNodeDatum {
  id: string
  label: string
  x: number // 0..100 viewbox-relative
  y: number
  r: number
  kind: 'active' | 'page' | 'journal' | 'dream' | 'reference' | 'idea'
}

export interface GraphEdgeDatum {
  from: string
  to: string
  strength: number // 0..1
}

export const graphNodes: GraphNodeDatum[] = [
  { id: 'active', label: 'Operating Thesis', x: 50, y: 46, r: 7.5, kind: 'active' },
  { id: 'agents', label: 'Useful agents', x: 22, y: 26, r: 4.6, kind: 'page' },
  { id: 'brainmap', label: 'Second Brain Map', x: 74, y: 20, r: 4.2, kind: 'page' },
  { id: 'atlas', label: 'Project Atlas', x: 82, y: 48, r: 4.8, kind: 'reference' },
  { id: 'journal', label: 'May 16', x: 28, y: 66, r: 4, kind: 'journal' },
  { id: 'dream', label: 'Dream · 05-31', x: 62, y: 74, r: 3.6, kind: 'dream' },
  { id: 'clarity', label: 'Clarity compounds', x: 12, y: 48, r: 3.4, kind: 'idea' },
  { id: 'memory', label: 'Memory layer', x: 44, y: 14, r: 3.8, kind: 'idea' },
  { id: 'people', label: 'People', x: 88, y: 30, r: 3, kind: 'reference' },
  { id: 'routines', label: 'Routines', x: 36, y: 84, r: 3.2, kind: 'journal' },
]

export const graphEdges: GraphEdgeDatum[] = [
  { from: 'active', to: 'agents', strength: 0.9 },
  { from: 'active', to: 'brainmap', strength: 0.85 },
  { from: 'active', to: 'atlas', strength: 0.7 },
  { from: 'active', to: 'journal', strength: 0.75 },
  { from: 'active', to: 'memory', strength: 0.8 },
  { from: 'agents', to: 'clarity', strength: 0.5 },
  { from: 'brainmap', to: 'people', strength: 0.45 },
  { from: 'journal', to: 'routines', strength: 0.5 },
  { from: 'dream', to: 'active', strength: 0.4 },
  { from: 'memory', to: 'brainmap', strength: 0.55 },
  { from: 'atlas', to: 'people', strength: 0.5 },
  { from: 'dream', to: 'journal', strength: 0.35 },
]

export const railStats = [
  { label: 'Nodes', value: '1,102', delta: '+6 this week' },
  { label: 'Pages', value: '342', delta: '+1 this week' },
  { label: 'Links', value: '842', delta: '+14 this week' },
]

export const relationshipScan = [
  {
    tier: 'Strong connection',
    notes: 'Operating Thesis → Project Atlas',
    pct: 92,
    tone: 'teal',
  },
  {
    tier: 'Emerging connection',
    notes: 'Useful agents → Memory layer',
    pct: 64,
    tone: 'amber',
  },
  {
    tier: 'Weak connection',
    notes: 'Dreams → Archive',
    pct: 38,
    tone: 'lilac',
  },
]

export const memoryLanes = [
  { label: 'Daily notes', count: 13, tone: 'teal', spark: [3, 5, 4, 7, 6, 8, 9, 11, 10, 13] },
  { label: 'Ideas', count: 34, tone: 'iris', spark: [12, 14, 11, 16, 15, 19, 22, 20, 26, 34] },
  { label: 'Projects', count: 6, tone: 'amber', spark: [2, 3, 3, 4, 3, 5, 4, 6, 5, 6] },
  { label: 'References', count: 26, tone: 'coral', spark: [8, 7, 9, 11, 10, 12, 14, 13, 18, 26] },
]

export const railSummary = {
  text: 'A thesis on memory-native developer tools and local-first agent workflows. Argues that the winning layer is memory: identity, context, and intent signal.',
  model: 'Chitragupta · recall.unified',
}

export const railHighlights = [
  { quote: 'Useful agents are more than better chat boxes.', tone: 'amber' },
  { quote: 'The winning layer is memory: identity, context, and intent signal.', tone: 'teal' },
  { quote: 'Context is expensive. Tokens, latency, and attention all compound.', tone: 'coral' },
  { quote: 'Local-first unlocks trust. Your data, your models, your rules.', tone: 'lilac' },
]

export const railOutline = [
  { depth: 2, title: 'Operating Thesis', count: 1 },
  { depth: 3, title: 'Why Memory Matters', count: 3 },
  { depth: 3, title: 'Useful Agents', count: 2 },
  { depth: 3, title: 'Implications', count: 4 },
]

export const reflectionSignals = [
  { label: 'Clarity', pct: 72, tone: 'teal' },
  { label: 'Energy', pct: 64, tone: 'amber' },
  { label: 'Focus', pct: 81, tone: 'iris' },
  { label: 'Connection', pct: 69, tone: 'coral' },
]

export const memoryCues = [
  { icon: 'sparkle', text: 'You noted last week: “Clarity compounds when captured.”', date: 'May 10' },
  { icon: 'link', text: 'Related to recent work: Second Brain Map', date: 'May 16' },
  { icon: 'bookmark', text: 'Recent useful note: Useful agents that remember', date: 'May 14' },
]

export const reflectionHighlights = [
  'You captured 12 meaningful moments',
  'You revisited 3 core themes',
  'Your clarity peaks mid-week',
  'Consider more rest & renewal',
]

// --- Chitragupta communication thread ---

export type RecallKind = 'note' | 'memory' | 'session' | 'day' | 'wiki'

export interface RecallSource {
  kind: RecallKind
  title: string
  detail: string
  score: number
  ref: string
}

export const recallSources: RecallSource[] = [
  {
    kind: 'note',
    title: 'Useful agents that remember',
    detail: 'Memory-native developer tools for terminal agents…',
    score: 0.94,
    ref: '[1]',
  },
  {
    kind: 'memory',
    title: 'Preference captured · Apr 28',
    detail: '“Prefers short morning briefings, actionable items first.”',
    score: 0.89,
    ref: '[2]',
  },
  {
    kind: 'session',
    title: 'Console session · May 12',
    detail: 'Discussed recall.unified routing and source scoring.',
    score: 0.81,
    ref: '[3]',
  },
  {
    kind: 'day',
    title: 'Journal · May 16',
    detail: '“Clarity compounds when captured.” Morning pages…',
    score: 0.77,
    ref: '[4]',
  },
  {
    kind: 'wiki',
    title: 'Wiki · Memory layer',
    detail: 'Entity memory, preferences, recency, summaries.',
    score: 0.72,
    ref: '[5]',
  },
]

export const proposedMemories = [
  {
    text: 'Srinivas is building Grimoire — a local-first markdown journal with a Second Brain layer. Priority: ship native iOS capture in Q4.',
    why: 'Derived from today’s journal + Project Atlas',
  },
]

export const crystallizeSteps = [
  { label: 'Collect thread', state: 'done' },
  { label: 'Resolve sources', state: 'done' },
  { label: 'Draft note', state: 'active' },
  { label: 'You review & save', state: 'todo' },
] as const
