import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  APP_COMMAND_IDS,
  getAppCommandShortcutDisplay,
} from '../../hooks/appCommandCatalog'

interface SidebarSearchLauncherProps {
  onOpenSearch?: () => void
}

/** Opens the vault-wide Spotlight search from the left sidebar. */
export function SidebarSearchLauncher({ onOpenSearch }: SidebarSearchLauncherProps) {
  if (!onOpenSearch) return null

  const shortcut = getAppCommandShortcutDisplay(APP_COMMAND_IDS.editFindInVault) ?? ''
  const title = shortcut ? `Search open vaults (${shortcut})` : 'Search open vaults'

  return (
    <div className="border-b border-border px-2 py-2" data-testid="sidebar-search-launcher">
      <Button
        type="button"
        variant="ghost"
        className="group h-auto min-h-14 w-full justify-start gap-2.5 rounded-lg border border-border/70 bg-background/55 px-2.5 py-2 text-left text-muted-foreground shadow-xs transition-colors hover:border-primary/35 hover:bg-accent/75 hover:text-foreground"
        onClick={onOpenSearch}
        aria-label="Search open vaults"
        title={title}
        data-testid="sidebar-search-button"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border/60 bg-background/80 text-muted-foreground shadow-xs transition-colors group-hover:border-primary/30 group-hover:text-primary">
          <Search size={15} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-foreground">Search vaults</span>
          <span className="block truncate text-[10.5px] font-medium text-muted-foreground">
            Notes, docs, text files
          </span>
        </span>
        {shortcut ? (
          <kbd className="shrink-0 rounded border border-border/70 bg-muted/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {shortcut}
          </kbd>
        ) : null}
      </Button>
    </div>
  )
}
