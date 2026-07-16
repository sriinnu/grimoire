import { Folder, FolderOpen, type IconProps } from '@phosphor-icons/react'

type FolderGlyphProps = IconProps

/**
 * Folder rows must scan as folders first. Domain meaning is carried by the
 * surrounding semantic tone, rather than by miniature illustrations that turn
 * into visual noise at sidebar size.
 */
function ClosedFolderGlyph({ name, ...props }: FolderGlyphProps & { name: string }) {
  return <Folder {...props} aria-hidden={props['aria-hidden'] ?? true} data-domain-folder-glyph={name} />
}

export function DefaultFolderGlyphIcon(props: FolderGlyphProps) {
  return <ClosedFolderGlyph {...props} name="folder" />
}

export function DefaultFolderOpenGlyphIcon(props: FolderGlyphProps) {
  return <FolderOpen {...props} aria-hidden={props['aria-hidden'] ?? true} data-domain-folder-glyph="folder-open" />
}

// Keep these exports stable for extensions that import the old domain names.
// They intentionally share one recognisable folder silhouette.
export function DevFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="dev" /> }
export function DocsFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="docs" /> }
export function DataFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="data" /> }
export function JournalFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="journal" /> }
export function VaultFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="vault" /> }
export function PrivateFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="private" /> }
export function ResearchFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="research" /> }
export function TemplateFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="template" /> }
export function AgentFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="agent" /> }
export function StorageFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="storage" /> }
export function AstralFolderGlyphIcon(props: FolderGlyphProps) { return <ClosedFolderGlyph {...props} name="astral" /> }
