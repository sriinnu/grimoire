import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Glyph } from './glyphs/Glyph'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { resolveThemePreset, type ThemePreset } from '@/lib/appearance'
import {
  buildVaultTargetPath,
  buildVaultCreationPlan,
  DEFAULT_VAULT_NAME,
  getVaultStorageChoice,
  getVaultTemplateKind,
  sanitizeVaultFolderName,
  type CreateEmptyVaultRequest,
  type VaultStorageChoiceId,
  type VaultTemplateKindId,
  VAULT_STORAGE_CHOICES,
  VAULT_TEMPLATE_KINDS,
} from '@/utils/vaultCreation'
import { isTauri } from '@/mock-tauri'
import { pickFolder } from '@/utils/vault-dialog'
import { CreateVaultExperienceProfilePicker } from './CreateVaultExperienceProfile'

interface CreateVaultDialogProps {
  initialThemePreset?: ThemePreset | null
  open: boolean
  onClose: () => void
  onCreate: (request: CreateEmptyVaultRequest) => Promise<boolean> | boolean
}

type SubmitState = 'idle' | 'creating'

const CLOUD_CHOICE_IDS = new Set<VaultStorageChoiceId>(['icloud', 'google-drive', 'synced-folder'])
const ShieldIcon = (props: { className?: string }) => <Glyph name="shield" className={props.className} />
const FileIcon = (props: { className?: string }) => <Glyph name="file" className={props.className} />
const GitIcon = (props: { className?: string }) => <Glyph name="gitHistory" className={props.className} />

const VAULT_PROMISES = [
  { label: 'Plain Markdown', detail: 'Readable outside Grimoire', icon: FileIcon },
  { label: 'Private by default', detail: 'Journals and dreams stay local', icon: ShieldIcon },
  { label: 'Git optional', detail: 'History can stay off', icon: GitIcon },
]

function extractFolderNameFromSelection(selectedPath: string): string {
  const decodedPath = (() => {
    try {
      return decodeURIComponent(selectedPath)
    } catch {
      return selectedPath
    }
  })()
  const normalizedPath = decodedPath
    .replace(/\\/gu, '/')
    .replace(/\/+/gu, '/')
    .replace(/^file:\/\//u, '')
    .replace(/^\/+/, '')

  return normalizedPath.split('/').filter(Boolean).pop() ?? DEFAULT_VAULT_NAME
}

function choiceIcon(choiceId: VaultStorageChoiceId) {
  if (choiceId === 'local') return <Glyph name="localVault" className="size-4" />
  if (CLOUD_CHOICE_IDS.has(choiceId)) return <Glyph name="cloudVault" className="size-4" />
  return <Glyph name="folder" />
}

function shouldUpdateSuggestedPath(pathDirty: boolean, targetPath: string, previousSuggestion: string): boolean {
  return !pathDirty || !targetPath.trim() || targetPath === previousSuggestion
}

/** Dialog for creating local-first notebooks in local or cloud-synced folders. */
export function CreateVaultDialog({ initialThemePreset, open, onClose, onCreate }: CreateVaultDialogProps) {
  const [vaultName, setVaultName] = useState(DEFAULT_VAULT_NAME)
  const [templateKind, setTemplateKind] = useState<VaultTemplateKindId>('blank')
  const [experienceProfile, setExperienceProfile] = useState<ThemePreset>(() => resolveThemePreset(initialThemePreset))
  const [storageChoice, setStorageChoice] = useState<VaultStorageChoiceId>('local')
  const [targetPath, setTargetPath] = useState(() => buildVaultTargetPath('local', DEFAULT_VAULT_NAME))
  const [pathDirty, setPathDirty] = useState(false)
  const [initializeGit, setInitializeGit] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [error, setError] = useState<string | null>(null)
  const previousSuggestionRef = useRef(targetPath)
  const nativeFolderPickerAvailable = isTauri()

  const selectedChoice = useMemo(() => getVaultStorageChoice(storageChoice), [storageChoice])
  const creationPlan = useMemo(() => buildVaultCreationPlan({
    choiceId: storageChoice,
    initializeGit,
    targetPath,
    templateKind,
    themePreset: experienceProfile,
  }), [experienceProfile, initializeGit, storageChoice, targetPath, templateKind])
  const canSubmit = submitState === 'idle' && targetPath.trim().length > 0 && vaultName.trim().length > 0

  const resetState = useCallback(() => {
    const defaultPath = buildVaultTargetPath('local', DEFAULT_VAULT_NAME)
    const defaultExperienceProfile = resolveThemePreset(initialThemePreset)
    setVaultName(DEFAULT_VAULT_NAME)
    setTemplateKind('blank')
    setExperienceProfile(defaultExperienceProfile)
    setStorageChoice('local')
    setTargetPath(defaultPath)
    setPathDirty(false)
    setInitializeGit(false)
    setSubmitState('idle')
    setError(null)
    previousSuggestionRef.current = defaultPath
  }, [initialThemePreset])

  useEffect(() => {
    if (open) resetState()
  }, [open, resetState])

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen || submitState === 'creating') return
    resetState()
    onClose()
  }, [onClose, resetState, submitState])

  const syncSuggestedPath = useCallback((nextChoice: VaultStorageChoiceId, nextName: string) => {
    const nextSuggestion = buildVaultTargetPath(nextChoice, nextName)
    if (shouldUpdateSuggestedPath(pathDirty, targetPath, previousSuggestionRef.current)) {
      setTargetPath(nextSuggestion)
    }
    previousSuggestionRef.current = nextSuggestion
  }, [pathDirty, targetPath])

  const handleVaultNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value
    setVaultName(nextName)
    setError(null)
    syncSuggestedPath(storageChoice, nextName)
  }, [storageChoice, syncSuggestedPath])

  const handleTemplateKindChange = useCallback((nextKind: VaultTemplateKindId) => {
    const kind = getVaultTemplateKind(nextKind)
    setTemplateKind(nextKind)
    setVaultName(kind.defaultName)
    setError(null)
    syncSuggestedPath(storageChoice, kind.defaultName)
  }, [storageChoice, syncSuggestedPath])

  const handleStorageChoiceChange = useCallback((nextChoice: VaultStorageChoiceId) => {
    setStorageChoice(nextChoice)
    setError(null)
    syncSuggestedPath(nextChoice, vaultName)
  }, [syncSuggestedPath, vaultName])

  const handleTargetPathChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTargetPath(event.target.value)
    setPathDirty(true)
    setError(null)
  }, [])

  const handleChooseFolder = useCallback(async () => {
    if (!nativeFolderPickerAvailable || submitState === 'creating') return
    setError(null)

    try {
      const selected = await pickFolder('Choose empty folder for the new notebook')
      if (!selected) return

      setTargetPath(selected)
      setVaultName(sanitizeVaultFolderName(extractFolderNameFromSelection(selected)))
      setPathDirty(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [nativeFolderPickerAvailable, submitState])

  const handleCancel = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const path = targetPath.trim()
    if (!path) {
      setError('Choose a notebook path')
      return
    }

    setSubmitState('creating')
    setError(null)
    try {
      const ok = await onCreate({
        targetPath: path,
        storageProvider: selectedChoice.storageProvider,
        syncProvider: initializeGit ? 'git' : 'none',
        initializeGit,
        templateKind,
        themePreset: experienceProfile,
      })
      if (ok) {
        resetState()
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitState('idle')
    }
  }, [experienceProfile, initializeGit, onClose, onCreate, resetState, selectedChoice.storageProvider, targetPath, templateKind])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[560px]"
        data-testid="create-vault-dialog"
      >
        <DialogHeader className="px-6 pt-6 pr-12 pb-4">
          <DialogTitle>Create Notebook</DialogTitle>
          <DialogDescription>
            Make a private Markdown notebook. It stays in the folder you choose.
          </DialogDescription>
        </DialogHeader>

        <form className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden" onSubmit={handleSubmit}>
          <div className="grid min-h-0 gap-4 overflow-y-auto px-6 pt-2 pb-4" data-testid="create-vault-scroll-body">
            <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3" data-testid="create-vault-local-contract">
              <div className="text-xs font-medium text-muted-foreground">Local-first contract</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {VAULT_PROMISES.map(({ detail, icon: Icon, label }) => (
                  <div key={label} className="min-w-0 rounded-md border border-border/70 bg-background/70 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="create-vault-name">Name</label>
              <Input
                id="create-vault-name"
                value={vaultName}
                onChange={handleVaultNameChange}
                data-testid="create-vault-name"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Notebook template</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {VAULT_TEMPLATE_KINDS.map((kind) => {
                  const selected = kind.id === templateKind
                  return (
                    <Button
                      key={kind.id}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      className="h-auto justify-start gap-3 rounded-md px-3 py-2 text-left"
                      onClick={() => handleTemplateKindChange(kind.id)}
                      data-testid={`create-vault-template-${kind.id}`}
                    >
                      <Glyph name="file" className="size-4" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{kind.label}</span>
                        <span className="block truncate text-xs opacity-75">{kind.detail}</span>
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>

            <CreateVaultExperienceProfilePicker value={experienceProfile} onChange={setExperienceProfile} />

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Notebook home</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {VAULT_STORAGE_CHOICES.map((choice) => {
                  const selected = choice.id === storageChoice
                  return (
                    <Button
                      key={choice.id}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      className="h-auto justify-start gap-3 rounded-md px-3 py-2 text-left"
                      onClick={() => handleStorageChoiceChange(choice.id)}
                      data-testid={`create-vault-storage-${choice.id}`}
                    >
                      {choiceIcon(choice.id)}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{choice.label}</span>
                        <span className="block truncate text-xs opacity-75">{choice.detail}</span>
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="create-vault-path">Markdown folder</label>
              <div className="flex gap-2">
                <Input
                  id="create-vault-path"
                  value={targetPath}
                  onChange={handleTargetPathChange}
                  data-testid="create-vault-path"
                />
                {nativeFolderPickerAvailable && (
                  <Button type="button" variant="outline" onClick={handleChooseFolder} disabled={submitState === 'creating'}>
                    <Glyph name="folder" className="size-4" />
                    Choose
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <Checkbox
                checked={initializeGit}
                onCheckedChange={(checked) => setInitializeGit(checked === true)}
                data-testid="create-vault-git"
                aria-label="Initialize Git history"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Glyph name="gitHistory" className="size-4 text-muted-foreground" />
                  Initialize Git history
                </div>
                <div className="text-xs text-muted-foreground">Off by default. Local-only notebooks work without Git.</div>
              </div>
            </div>

            <div className="grid gap-2 rounded-md border border-border bg-muted/20 px-3 py-2" data-testid="create-vault-plan">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Glyph name="shield" size={16} className="text-muted-foreground" />
                Creation plan
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Template:</span> {creationPlan.templateLabel}
                </div>
                <div>
                  <span className="font-medium text-foreground">Experience:</span> {creationPlan.experienceLabel}. {creationPlan.experienceDetail}
                </div>
                <div>
                  <span className="font-medium text-foreground">Storage:</span> {creationPlan.storageDetail}
                </div>
                <div>
                  <span className="font-medium text-foreground">History:</span> {creationPlan.syncDetail}
                </div>
                <div>
                  <span className="font-medium text-foreground">Privacy:</span> {creationPlan.privacyDetail}
                </div>
                <div className="truncate">
                  <span className="font-medium text-foreground">Path:</span> {creationPlan.targetPath}
                </div>
              </div>
            </div>
          </div>

          <div
            className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-background/95 px-6 py-4"
            data-testid="create-vault-action-footer"
          >
            {error && (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={submitState === 'creating'}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit} data-testid="create-vault-submit">
                <Glyph name="file" className="size-4" />
                {submitState === 'creating' ? 'Creating...' : 'Create Notebook'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
