import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cloud, FileText, FolderOpen, GitBranch, HardDrive, ShieldCheck, Sparkles } from 'lucide-react'
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

interface CreateVaultDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (request: CreateEmptyVaultRequest) => Promise<boolean> | boolean
}

type SubmitState = 'idle' | 'creating'

const CLOUD_CHOICE_IDS = new Set<VaultStorageChoiceId>(['icloud', 'google-drive', 'synced-folder'])
const VAULT_PROMISES = [
  { label: 'Plain Markdown', detail: 'Readable outside Grimoire', icon: FileText },
  { label: 'Private by default', detail: 'Journals and dreams stay local', icon: ShieldCheck },
  { label: 'Git optional', detail: 'History can stay off', icon: GitBranch },
]

function choiceIcon(choiceId: VaultStorageChoiceId) {
  if (choiceId === 'local') return <HardDrive className="size-4" />
  if (CLOUD_CHOICE_IDS.has(choiceId)) return <Cloud className="size-4" />
  return <FolderOpen className="size-4" />
}

function shouldUpdateSuggestedPath(pathDirty: boolean, targetPath: string, previousSuggestion: string): boolean {
  return !pathDirty || !targetPath.trim() || targetPath === previousSuggestion
}

/** Dialog for creating local-first vaults in local or cloud-synced folders. */
export function CreateVaultDialog({ open, onClose, onCreate }: CreateVaultDialogProps) {
  const [vaultName, setVaultName] = useState(DEFAULT_VAULT_NAME)
  const [templateKind, setTemplateKind] = useState<VaultTemplateKindId>('blank')
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
  }), [initializeGit, storageChoice, targetPath, templateKind])
  const canSubmit = submitState === 'idle' && targetPath.trim().length > 0 && vaultName.trim().length > 0

  const resetState = useCallback(() => {
    const defaultPath = buildVaultTargetPath('local', DEFAULT_VAULT_NAME)
    setVaultName(DEFAULT_VAULT_NAME)
    setTemplateKind('blank')
    setStorageChoice('local')
    setTargetPath(defaultPath)
    setPathDirty(false)
    setInitializeGit(false)
    setSubmitState('idle')
    setError(null)
    previousSuggestionRef.current = defaultPath
  }, [])

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
      const selected = await pickFolder('Choose empty folder for the new vault')
      if (!selected) return

      setTargetPath(selected)
      setVaultName(sanitizeVaultFolderName(selected.split('/').filter(Boolean).pop() ?? DEFAULT_VAULT_NAME))
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
      setError('Choose a vault path')
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
  }, [initializeGit, onClose, onCreate, resetState, selectedChoice.storageProvider, targetPath, templateKind])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]" data-testid="create-vault-dialog">
        <DialogHeader>
          <DialogTitle>Create Vault</DialogTitle>
          <DialogDescription>
            Make a private Markdown space. Sync is only the folder you choose.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
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
            <div className="text-xs font-medium text-muted-foreground">Vault template</div>
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
                    <Sparkles className="size-4" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{kind.label}</span>
                      <span className="block truncate text-xs opacity-75">{kind.detail}</span>
                    </span>
                  </Button>
                )
              })}
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
            <div className="text-xs font-medium text-muted-foreground">Vault home</div>
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
                  <FolderOpen className="size-4" />
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
                <GitBranch className="size-4 text-muted-foreground" />
                Initialize Git history
              </div>
              <div className="text-xs text-muted-foreground">Off by default. Local-only vaults work without Git.</div>
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-border bg-muted/20 px-3 py-2" data-testid="create-vault-plan">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Creation plan
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Template:</span> {creationPlan.templateLabel}
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

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={submitState === 'creating'}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} data-testid="create-vault-submit">
              <Sparkles className="size-4" />
              {submitState === 'creating' ? 'Creating...' : 'Create Vault'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
