import type { VaultEntry } from '../types'
import type { NoteReference } from './ai-context'
import { DAILY_THREAD_CRYSTALLIZE_PROMPT } from '../lib/timeLoomGuidance'
import { buildAskContextPackage, type AskContextIntent, type AskContextPackage } from '../lib/askContextPackage'
import { buildProviderPromptDraft, mergeNoteReferences } from '../lib/providerPromptPrivacy'

export interface DashboardAskContextPreview {
  intent: AskContextIntent | null
  memoryReferences: AskContextPackage['memoryReferences']
  protectedCount: number
  protectedMemoryCount: number
  references: NoteReference[]
  sourceLabels: string[]
  visibleCount: number
}

export interface DashboardAskPlan {
  contextPackage: AskContextPackage
  kind: 'ask'
  prompt: string
  references: NoteReference[]
  intent: AskContextIntent | null
}

/** Selects safe recent vault references for dashboard-originated agent asks. */
export function buildDashboardAskReferences(entries: VaultEntry[], limit = 5): NoteReference[] {
  return buildDashboardAskContextPreview(entries, limit).references
}

/** Identifies structured dashboard ask intents from exact app-owned prompt seeds. */
export function dashboardAskIntentForPrompt(prompt: string): AskContextIntent | null {
  if (normalizeAskIntentText(prompt) !== normalizeAskIntentText(DAILY_THREAD_CRYSTALLIZE_PROMPT)) return null
  return {
    kind: 'crystallize-memory',
    label: 'Daily Thread Crystallize',
    origin: 'daily-thread',
    reviewMode: 'review-before-write',
    sourcePolicy: 'public-references-only',
    target: 'markdown-memory',
  }
}

/** Describes exactly which dashboard context is safe to show before an ask leaves the UI. */
export function buildDashboardAskContextPreview(
  entries: VaultEntry[],
  limit = 5,
  prompt = '',
): DashboardAskContextPreview {
  const contextPackage = buildAskContextPackage({ entries, limit, prompt: '' })
  return {
    intent: dashboardAskIntentForPrompt(prompt),
    memoryReferences: contextPackage.memoryReferences,
    protectedCount: contextPackage.withheld.protectedNotes,
    protectedMemoryCount: contextPackage.withheld.protectedMemories,
    references: contextPackage.references,
    sourceLabels: contextPackage.sourceLabels,
    visibleCount: contextPackage.visibleCount,
  }
}

/** Builds the source-safe context package for a submitted dashboard ask. */
export function buildDashboardAskPlan(entries: VaultEntry[], prompt: string): DashboardAskPlan {
  const promptDraft = buildProviderPromptDraft(prompt, entries)
  const intent = dashboardAskIntentForPrompt(promptDraft.text)
  const contextPackage = buildAskContextPackage({ entries, prompt: promptDraft.text })
  const references = mergeNoteReferences(promptDraft.references, contextPackage.references)
  return {
    contextPackage: sanitizeDashboardAskHandoffPackage({
      ...contextPackage,
      intent,
      references,
      sourceLabels: mergeSourceLabels(
        contextPackage.sourceLabels,
        promptDraft.references.map((reference) => reference.title),
      ),
    }),
    intent,
    kind: 'ask',
    prompt: promptDraft.text,
    references,
  }
}

function sanitizeDashboardAskHandoffPackage(contextPackage: AskContextPackage): AskContextPackage {
  return {
    ...contextPackage,
    withheld: {
      protectedMemories: 0,
      protectedNotes: 0,
    },
  }
}

function mergeSourceLabels(...groups: string[][]): string[] {
  return [...new Set(groups.flat().filter((label) => label.trim().length > 0))]
}

function normalizeAskIntentText(prompt: string): string {
  return prompt
    .replace(/^\s*\/ask\b/i, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
