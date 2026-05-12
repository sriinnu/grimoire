import type { VaultEntry } from '../../types'
import { resolveVaultImageSrc } from '../../utils/vaultImages'

interface VaultImagePreviewProps {
  entry: VaultEntry
}

/** Displays image and SVG vault files as safe img-backed previews. */
export function VaultImagePreview({ entry }: VaultImagePreviewProps) {
  const source = resolveVaultImageSrc(entry.path)
  const label = entry.title || entry.filename

  return (
    <div className="flex flex-1 min-h-0 items-center justify-center overflow-auto bg-[var(--surface-editor)] p-8">
      <figure className="m-0 flex max-h-full max-w-full flex-col items-center gap-3">
        <img
          alt={label}
          className="max-h-[min(72vh,900px)] max-w-full rounded-md border border-border bg-background object-contain shadow-sm"
          data-testid="vault-image-preview"
          draggable={false}
          src={source}
        />
        <figcaption className="max-w-[min(720px,80vw)] truncate text-xs text-muted-foreground">
          {entry.filename}
        </figcaption>
      </figure>
    </div>
  )
}
