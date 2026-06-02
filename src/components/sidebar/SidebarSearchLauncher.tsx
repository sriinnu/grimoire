import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  APP_COMMAND_IDS,
  getAppCommandShortcutDisplay,
} from '../../hooks/appCommandCatalog'

interface SidebarSearchLauncherProps {
  onOpenSearch?: () => void
}

/** Opens the open-vault Spotlight search from the left sidebar. */
export function SidebarSearchLauncher({ onOpenSearch }: SidebarSearchLauncherProps) {
  if (!onOpenSearch) return null

  const shortcut = getAppCommandShortcutDisplay(APP_COMMAND_IDS.editFindInVault) ?? ''
  const title = shortcut
    ? `Open Spotlight search across open vaults, docs, and project text (${shortcut})`
    : 'Open Spotlight search across open vaults, docs, and project text'

  return (
    <div className="border-b border-border px-2.5 py-2.5" data-testid="sidebar-search-launcher">
      <Button
        type="button"
        variant="ghost"
        className="group h-auto min-h-12 w-full justify-start gap-2.5 rounded-2xl border border-border/75 bg-background/75 px-3 py-2.5 text-left text-muted-foreground shadow-[0_10px_28px_-24px_var(--shadow-dialog)] transition-colors hover:border-primary/45 hover:bg-accent/85 hover:text-foreground"
        onClick={onOpenSearch}
        aria-label="Open Spotlight search across open vaults, docs, and project text"
        title={title}
        data-testid="sidebar-search-button"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/90 text-muted-foreground shadow-xs transition-colors group-hover:border-primary/40 group-hover:text-primary">
          <Search size={15} strokeWidth={2.35} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-foreground">Spotlight search</span>
          <span className="block truncate text-[10.5px] font-medium text-muted-foreground group-hover:text-muted-foreground">
            Open vaults · docs · text
          </span>
        </span>
        {shortcut ? (
          <kbd className="shrink-0 rounded-lg border border-border/70 bg-muted/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {shortcut}
          </kbd>
        ) : null}
      </Button>
    </div>
  )
}
