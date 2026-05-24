import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { VaultEntry } from '../types'
import { fuzzyMatch } from '../utils/fuzzyMatch'
import { queueAiPrompt, requestOpenAiChat } from '../utils/aiPromptBridge'
import type { NoteReference } from '../utils/ai-context'
import type { CommandAction, CommandGroup } from '../hooks/useCommandRegistry'
import { groupSortKey } from '../hooks/useCommandRegistry'
import { rememberFeedbackDialogOpener } from '../lib/feedbackDialogOpener'
import { createTranslator, type AppLocale } from '../lib/i18n'
import { CommandPaletteAiMode } from './CommandPaletteAiMode'
import { CommandPaletteFooter, CommandPaletteInput, CommandPaletteResults, type CommandPaletteFooterText } from './CommandPaletteParts'

interface CommandPaletteProps {
  open: boolean
  commands: CommandAction[]
  entries?: VaultEntry[]
  claudeCodeReady?: boolean
  aiAgentReady?: boolean
  aiAgentLabel?: string
  locale?: AppLocale
  onClose: () => void
}

interface ScoredCommand {
  command: CommandAction
  score: number
}

function focusPaletteTarget(target: HTMLInputElement | HTMLDivElement | null) {
  if (!target) return

  target.focus()

  if (!(target instanceof HTMLDivElement)) return

  const selection = window.getSelection()
  if (!selection) return

  const range = document.createRange()
  range.selectNodeContents(target)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function matchCommand(query: string, command: CommandAction): ScoredCommand | null {
  const labelResult = fuzzyMatch(query, command.label)
  if (labelResult.match) return { command, score: labelResult.score }

  for (const keyword of command.keywords ?? []) {
    const keywordResult = fuzzyMatch(query, keyword)
    if (keywordResult.match) return { command, score: keywordResult.score - 1 }
  }

  const groupResult = fuzzyMatch(query, command.group)
  if (groupResult.match) return { command, score: groupResult.score - 2 }

  return null
}

function groupResults(
  commands: CommandAction[],
  byRelevance: boolean,
): { group: CommandGroup; items: CommandAction[] }[] {
  const groupedCommands = new Map<CommandGroup, CommandAction[]>()

  for (const command of commands) {
    const existing = groupedCommands.get(command.group)
    if (existing) {
      existing.push(command)
      continue
    }
    groupedCommands.set(command.group, [command])
  }

  const entries = Array.from(groupedCommands.entries())
  if (!byRelevance) {
    entries.sort((left, right) => groupSortKey(left[0]) - groupSortKey(right[0]))
  }

  return entries.map(([group, items]) => ({ group, items }))
}

function usePaletteResults(commands: CommandAction[], query: string) {
  const enabledCommands = useMemo(
    () => commands.filter((command) => command.enabled),
    [commands],
  )

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return enabledCommands
    return enabledCommands
      .map((command) => matchCommand(query, command))
      .filter((result): result is ScoredCommand => result !== null)
      .sort((left, right) => right.score - left.score)
      .map((result) => result.command)
  }, [enabledCommands, query])

  const hasQuery = query.trim().length > 0
  const groups = useMemo(
    () => groupResults(filteredCommands, hasQuery),
    [filteredCommands, hasQuery],
  )

  return {
    groups,
    flatList: groups.flatMap((group) => group.items),
  }
}

function rememberCommandOpener(
  command: CommandAction,
  target: HTMLInputElement | HTMLDivElement | null,
) {
  if (command.id !== 'open-contribute') return
  rememberFeedbackDialogOpener(target instanceof HTMLElement ? target : null)
}

export function CommandPalette({ open, ...props }: CommandPaletteProps) {
  if (!open) return null
  return <OpenCommandPalette {...props} />
}

function OpenCommandPalette({
  commands,
  entries = [],
  claudeCodeReady = true,
  aiAgentReady,
  aiAgentLabel = 'Claude Code',
  locale = 'en',
  onClose,
}: Omit<CommandPaletteProps, 'open'>) {
  const [query, setQuery] = useState('')
  const [aiValue, setAiValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const aiInputRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const aiMode = aiValue.startsWith(' ')
  const resolvedAiAgentReady = aiAgentReady ?? claudeCodeReady
  const { groups, flatList } = usePaletteResults(commands, query)
  const t = createTranslator(locale)
  const footerText: CommandPaletteFooterText = {
    aiMode: t('command.aiMode', { agent: '{agent}' }),
    navigate: t('command.footerNavigate'),
    select: t('command.footerSelect'),
    send: t('command.footerSend'),
    close: t('command.footerClose'),
  }

  useLayoutEffect(() => {
    const target = aiMode ? aiInputRef.current : inputRef.current
    if (!target) return

    focusPaletteTarget(target)
    if (document.activeElement === target) return

    const focusRetry = window.requestAnimationFrame(() => {
      focusPaletteTarget(target)
    })
    return () => window.cancelAnimationFrame(focusRetry)
  }, [aiMode])

  useEffect(() => {
    if (aiMode || !listRef.current) return
    const selectedElement = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
    selectedElement?.scrollIntoView({ block: 'nearest' })
  }, [aiMode, selectedIndex])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (aiMode) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((current) => Math.min(current + 1, flatList.length - 1))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((current) => Math.max(current - 1, 0))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const command = flatList[selectedIndex]
        if (!command) return
        rememberCommandOpener(command, inputRef.current)
        onClose()
        command.execute()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aiMode, flatList, onClose, selectedIndex])

  const handleQueryChange = (nextQuery: string) => {
    setSelectedIndex(0)
    if (nextQuery.startsWith(' ')) {
      setAiValue(nextQuery)
      setQuery('')
      return
    }

    setQuery(nextQuery)
  }

  const handleAiValueChange = (nextValue: string) => {
    setSelectedIndex(0)
    if (nextValue.startsWith(' ')) {
      setAiValue(nextValue)
      return
    }

    setAiValue('')
    setQuery(nextValue)
  }

  const handleSelectCommand = (command: CommandAction) => {
    rememberCommandOpener(command, inputRef.current)
    onClose()
    command.execute()
  }

  const handleSubmitAiPrompt = (text: string, references: NoteReference[]) => {
    if (!text.trim()) {
      onClose()
      return
    }

    if (!resolvedAiAgentReady) return

    queueAiPrompt(text, references)
    requestOpenAiChat()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-center bg-[var(--shadow-dialog)] pt-[15vh]"
      onClick={onClose}
    >
      <div
        className={cn(
          'grimoire-command-stage flex w-[520px] max-h-[440px] max-w-[90vw] flex-col self-start overflow-hidden rounded-xl border border-[var(--border-dialog)] bg-popover shadow-[0_8px_32px_var(--shadow-dialog)]',
          aiMode && 'min-h-[220px]',
        )}
        data-testid="command-palette-surface"
        onClick={(event) => event.stopPropagation()}
      >
        {aiMode ? (
          <CommandPaletteAiMode
            entries={entries}
            value={aiValue}
            claudeCodeReady={claudeCodeReady}
            aiAgentReady={resolvedAiAgentReady}
            aiAgentLabel={aiAgentLabel}
            inputRef={aiInputRef}
            onChange={handleAiValueChange}
            onSubmit={handleSubmitAiPrompt}
          />
        ) : (
          <>
            <CommandPaletteInput
              inputRef={inputRef}
              query={query}
              placeholder={t('command.palettePlaceholder')}
              onChange={handleQueryChange}
            />
            <CommandPaletteResults
              groups={groups}
              selectedIndex={selectedIndex}
              listRef={listRef}
              emptyText={t('command.noMatches')}
              onHover={setSelectedIndex}
              onSelect={handleSelectCommand}
            />
            <CommandPaletteFooter aiMode={false} aiAgentLabel={aiAgentLabel} footerText={footerText} />
          </>
        )}
      </div>
    </div>
  )
}
