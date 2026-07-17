import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import {
  Archive,
  BookOpenText,
  FileText,
  Files,
  Graph,
  MoonStars,
  Notebook,
  SidebarSimple,
  TrayArrowDown,
} from '@phosphor-icons/react'

type SidebarGlyphProps = IconProps & { name: string }

/**
 * Primary navigation deliberately uses familiar, single-purpose symbols.
 * Labels remain present in the expanded sidebar; the exact same symbols carry
 * the collapsed rail, tooltips, and assistive names without needing bespoke art.
 */
function SidebarGlyph({ Icon, name, ...props }: SidebarGlyphProps & { Icon: ComponentType<IconProps> }) {
  return <Icon {...props} aria-hidden={props['aria-hidden'] ?? true} data-sidebar-glyph={name} />
}

export function NotebookGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={BookOpenText} name="notebook" />
}

export function InboxGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={TrayArrowDown} name="inbox" />
}

export function NotesGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={Files} name="notes" />
}

export function GraphGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={Graph} name="graph" />
}

export function JournalGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={Notebook} name="journal" />
}

export function DreamGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={MoonStars} name="dream" />
}

export function ArchiveGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={Archive} name="archive" />
}

export function SidebarExpandGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={SidebarSimple} name="expand-sidebar" />
}

/** Kept available for contextual file labels that use the sidebar icon language. */
export function PageGlyphIcon(props: IconProps) {
  return <SidebarGlyph {...props} Icon={FileText} name="page" />
}
