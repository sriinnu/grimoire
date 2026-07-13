import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { Glyph } from './glyphs/Glyph'
import type { VaultEntry } from '../types'
import { NoteTitleIcon } from './NoteTitleIcon'
import type { BreadcrumbBarProps } from './breadcrumbBarTypes'
import {
  beginFilenameEditing,
  deriveSyncStem,
  focusFilenameInput,
  handleFilenameInputKeyDown,
  resolveFilenameRenameTarget,
} from './breadcrumbBarModel'

function FilenameInput({
  inputRef,
  draftStem,
  onDraftStemChange,
  onBlur,
  onKeyDown,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  draftStem: string
  onDraftStemChange: (nextValue: string) => void
  onBlur: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <Input
      ref={inputRef}
      value={draftStem}
      onChange={(event) => onDraftStemChange(event.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className="h-7 w-[180px] text-sm"
      data-testid="breadcrumb-filename-input"
      aria-label="Rename filename"
    />
  )
}

function FilenameTrigger({
  entry,
  filenameStem,
  onStartEditing,
}: {
  entry: VaultEntry
  filenameStem: string
  onStartEditing: () => void
}) {
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onStartEditing()
  }, [onStartEditing])

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="h-auto min-w-0 gap-1 px-0 py-0 text-sm font-medium text-foreground hover:bg-transparent hover:text-foreground"
      onDoubleClick={onStartEditing}
      onKeyDown={handleKeyDown}
      data-testid="breadcrumb-filename-trigger"
      aria-label={`Filename ${filenameStem}. Press Enter to rename`}
    >
      <NoteTitleIcon icon={entry.icon} size={15} testId="breadcrumb-note-icon" />
      <span className="truncate">{filenameStem}</span>
    </Button>
  )
}

function SyncFilenameButton({
  entryPath,
  syncStem,
  onRenameFilename,
}: {
  entryPath: string
  syncStem: string | null
  onRenameFilename?: (path: string, newFilenameStem: string) => void
}) {
  if (!syncStem || !onRenameFilename) return null
  return (
    <ActionTooltip copy={{ label: 'Rename the file to match the title' }} side="bottom">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => onRenameFilename(entryPath, syncStem)}
        data-testid="breadcrumb-sync-button"
        aria-label="Rename the file to match the title"
      >
        <Glyph name="repeat" size={14} />
      </Button>
    </ActionTooltip>
  )
}

function FilenameDisplay({
  entry,
  filenameStem,
  syncStem,
  onRenameFilename,
  onStartEditing,
}: {
  entry: VaultEntry
  filenameStem: string
  syncStem: string | null
  onRenameFilename?: (path: string, newFilenameStem: string) => void
  onStartEditing: () => void
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <FilenameTrigger
        entry={entry}
        filenameStem={filenameStem}
        onStartEditing={onStartEditing}
      />
      <SyncFilenameButton
        entryPath={entry.path}
        syncStem={syncStem}
        onRenameFilename={onRenameFilename}
      />
    </div>
  )
}

function FilenameCrumb({
  entry,
  onRenameFilename,
}: Pick<BreadcrumbBarProps, 'entry' | 'onRenameFilename'>) {
  const filenameStem = useMemo(() => entry.filename.replace(/\.md$/, ''), [entry.filename])
  const syncStem = useMemo(() => deriveSyncStem(entry), [entry])
  const [isEditing, setIsEditing] = useState(false)
  const [draftStem, setDraftStem] = useState(filenameStem)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    focusFilenameInput(isEditing, inputRef)
  }, [isEditing])

  const startEditing = useCallback(() => {
    beginFilenameEditing(onRenameFilename, filenameStem, setDraftStem, setIsEditing)
  }, [onRenameFilename, filenameStem])

  const cancelEditing = useCallback(() => {
    setDraftStem(filenameStem)
    setIsEditing(false)
  }, [filenameStem])

  const submitRename = useCallback(() => {
    setIsEditing(false)
    const nextStem = resolveFilenameRenameTarget(draftStem, filenameStem)
    if (!nextStem) return
    onRenameFilename?.(entry.path, nextStem)
  }, [draftStem, filenameStem, onRenameFilename, entry.path])

  const handleInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    handleFilenameInputKeyDown(event, submitRename, cancelEditing)
  }, [submitRename, cancelEditing])

  if (isEditing) {
    return (
      <FilenameInput
        inputRef={inputRef}
        draftStem={draftStem}
        onDraftStemChange={setDraftStem}
        onBlur={submitRename}
        onKeyDown={handleInputKeyDown}
      />
    )
  }

  return (
    <FilenameDisplay
      entry={entry}
      filenameStem={filenameStem}
      syncStem={syncStem}
      onRenameFilename={onRenameFilename}
      onStartEditing={startEditing}
    />
  )
}

/** Breadcrumb title section, including file stem editing and title-sync action. */
export function BreadcrumbTitle({
  entry,
  onRenameFilename,
}: Pick<BreadcrumbBarProps, 'entry' | 'onRenameFilename'>) {
  const typeLabel = entry.isA ?? 'Note'
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <span className="shrink-0">{typeLabel}</span>
      <span className="shrink-0 text-border">›</span>
      <div className="flex min-w-0 items-center gap-1 truncate">
        <FilenameCrumb entry={entry} onRenameFilename={onRenameFilename} />
      </div>
    </div>
  )
}
