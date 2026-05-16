import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cloud, FolderOpen, GitBranch, HardDrive, Sparkles } from 'lucide-react'
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
  DEFAULT_VAULT_NAME,
  getVaultStorageChoice,
  sanitizeVaultFolderName,
  type CreateEmptyVaultRequest,
  type VaultStorageChoiceId,
  VAULT_STORAGE_CHOICES,
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
  const [storageChoice, setStorageChoice] = useState<VaultStorageChoiceId>('local')
  const [targetPath, setTargetPath] = useState(() => buildVaultTargetPath('local', DEFAULT_VAULT_NAME))
  const [pathDirty, setPathDirty] = useState(false)
  const [initializeGit, setInitializeGit] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [error, setError] = useState<string | null>(null)
  const previousSuggestionRef = useRef(targetPath)
  const nativeFolderPickerAvailable = isTauri()

  const selectedChoice = useMemo(() => getVaultStorageChoice(storageChoice), [storageChoice])
  const canSubmit = submitState === 'idle' && targetPath.trim().length > 0 && vaultName.trim().length > 0

  const resetState = useCallback(() => {
    const defaultPath = buildVaultTargetPath('local', DEFAULT_VAULT_NAME)
    setVaultName(DEFAULT_VAULT_NAME)
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
  }, [initializeGit, onClose, onCreate, resetState, selectedChoice.storageProvider, targetPath])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]" data-testid="create-vault-dialog">
        <DialogHeader>
          <DialogTitle>Create Vault</DialogTitle>
          <DialogDescription>
            Create a local-first markdown vault in a folder you own.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
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
            <div className="text-xs font-medium text-muted-foreground">Storage</div>
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
            <label className="text-xs font-medium text-muted-foreground" htmlFor="create-vault-path">Folder path</label>
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
