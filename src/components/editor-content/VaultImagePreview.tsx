import { useState } from 'react'
import type { VaultEntry } from '../../types'
import { resolveVaultImageSrc } from '../../utils/vaultImages'

interface VaultImagePreviewProps {
  entry: VaultEntry
}

type ImagePreviewState = 'loading' | 'loaded' | 'error'

function imageFileKind(filename: string): string {
  const extension = filename.split('.').pop()?.trim()
  return extension ? extension.toUpperCase() : 'Image'
}

function imageStateLabel(state: ImagePreviewState): string {
  if (state === 'loaded') return 'Loaded'
  if (state === 'error') return 'Unavailable'
  return 'Loading'
}

/** Displays image and SVG vault files as safe img-backed previews. */
export function VaultImagePreview({ entry }: VaultImagePreviewProps) {
  const [previewState, setPreviewState] = useState<ImagePreviewState>('loading')
  const source = resolveVaultImageSrc(entry.path)
  const label = entry.title || entry.filename

  return (
    <div
      className="vault-image-preview-shell grid flex-1 min-h-0 overflow-hidden p-6"
      data-testid="vault-image-shell"
    >
      <figure className="vault-image-preview-frame m-0 grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
        <div
          className="vault-image-preview-stage relative flex min-h-0 items-center justify-center overflow-hidden rounded-md border border-border"
          data-testid="vault-image-stage"
          data-state={previewState}
        >
          {previewState === 'loading' ? (
            <div
              className="vault-image-preview-state absolute inset-0 grid place-items-center text-xs font-medium text-muted-foreground"
              data-testid="vault-image-loading"
            >
              Loading image
            </div>
          ) : null}
          {previewState === 'error' ? (
            <div
              className="vault-image-preview-state absolute inset-0 grid place-items-center px-6 text-center text-sm font-medium text-muted-foreground"
              data-testid="vault-image-error"
            >
              Image could not be loaded
            </div>
          ) : null}
          <img
            alt={label}
            className={`vault-image-preview-media max-h-full max-w-full object-contain transition-opacity ${previewState === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
            data-testid="vault-image-preview"
            data-state={previewState}
            decoding="async"
            draggable={false}
            onError={() => setPreviewState('error')}
            onLoad={() => setPreviewState('loaded')}
            src={source}
          />
        </div>
        <figcaption className="vault-image-preview-caption text-xs text-muted-foreground" data-testid="vault-image-caption">
          <span className="vault-image-preview-caption__name">{entry.filename}</span>
          <span className="vault-image-preview-caption__chip">{imageFileKind(entry.filename)}</span>
          <span className="vault-image-preview-caption__chip" data-state={previewState}>
            {imageStateLabel(previewState)}
          </span>
        </figcaption>
      </figure>
    </div>
  )
}
