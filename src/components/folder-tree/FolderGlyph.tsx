import { cn } from '@/lib/utils'
import type { FolderNode } from '../../types'
import { resolveFolderGlyphModel } from './folderGlyphModel'
import './FolderGlyph.css'

/** Renders one familiar folder silhouette with a semantic tone for each sidebar row. */
export function FolderGlyph({
  className,
  isOpen,
  isSelected,
  node,
}: {
  className?: string
  isOpen: boolean
  isSelected: boolean
  node: FolderNode
}) {
  const model = resolveFolderGlyphModel(node, isOpen)
  const Icon = model.Icon

  return (
    <span
      aria-hidden="true"
      className={cn('folder-glyph', className)}
      data-folder-glyph={model.name}
      data-folder-glyph-tone={model.tone}
      data-open={isOpen ? 'true' : 'false'}
      data-selected={isSelected ? 'true' : 'false'}
      data-testid={`folder-glyph:${node.path}`}
    >
      <Icon className="folder-glyph__icon" size={16} weight={isOpen || isSelected ? 'duotone' : 'regular'} />
    </span>
  )
}
