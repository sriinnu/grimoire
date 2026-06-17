import {
  AppWindow,
  Cloud,
  GearSix,
  GitBranch,
  PaintBrush,
  Robot,
  ShieldCheck,
  Translate,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, type ComponentType } from 'react'
import { cn } from '../../lib/utils'
import { formatVaultPathForDisplay } from '../../utils/vaultDisplayName'
import { desktopPlatformLabel, getDesktopPlatform } from '../../utils/platform'
import { useHomeDir } from '../../hooks/useHomeDir'
import { Button } from '../ui/button'
import type { SettingsBodyProps } from './settingsTypes'

type SettingsNavItem = {
  id: string
  label: string
  icon: ComponentType<IconProps>
}

interface SettingsNavigationProps extends Pick<SettingsBodyProps, 't' | 'vaultPath' | 'isGitVault'> {
  activeSectionId: string
  onSectionChange: (sectionId: string) => void
}

function createSettingsNav(t: SettingsBodyProps['t']): SettingsNavItem[] {
  return [
    { id: 'settings-portability', label: t('settings.portability.title'), icon: Cloud },
    { id: 'settings-sync', label: t('settings.sync.title'), icon: GitBranch },
    { id: 'settings-appearance', label: t('settings.appearance.title'), icon: PaintBrush },
    { id: 'settings-workflow', label: t('settings.workflow.title'), icon: GearSix },
    { id: 'settings-agents', label: t('settings.aiAgents.title'), icon: Robot },
    { id: 'settings-language', label: t('settings.language.title'), icon: Translate },
    { id: 'settings-native', label: t('settings.native.title', { platform: desktopPlatformLabel() }), icon: AppWindow },
    { id: 'settings-privacy', label: t('settings.privacy.title'), icon: ShieldCheck },
  ]
}

function vaultName(vaultPath: string): string {
  return vaultPath.split(/[\\/]/u).filter(Boolean).pop() ?? 'Local Notebook'
}

function scrollToSettingsSection(sectionId: string, onSectionChange: (sectionId: string) => void) {
  onSectionChange(sectionId)
  const target = document.getElementById(sectionId)
  if (!target) return

  const scrollSurface = document.querySelector<HTMLElement>('[data-testid="settings-main-surface"]')
  if (!scrollSurface) {
    target.scrollIntoView?.({ block: 'start' })
    return
  }

  const surfaceTop = scrollSurface.getBoundingClientRect().top
  const targetTop = target.getBoundingClientRect().top
  const top = scrollSurface.scrollTop + targetTop - surfaceTop - 12
  const boundedTop = Math.max(0, top)
  if (typeof scrollSurface.scrollTo === 'function') {
    scrollSurface.scrollTo({ top: boundedTop, behavior: 'auto' })
    return
  }
  scrollSurface.scrollTop = boundedTop
}

/** Renders the desktop Settings sidebar rail with vault-local status context. */
export function SettingsNavigation({ t, vaultPath, isGitVault, activeSectionId, onSectionChange }: SettingsNavigationProps) {
  const navItems = useMemo(() => createSettingsNav(t), [t])
  const homeDir = useHomeDir()
  const displayPath = formatVaultPathForDisplay(vaultPath, { homeDir, platform: getDesktopPlatform() })

  return (
    <aside
      className="settings-navigation-rail hidden w-[248px] shrink-0 border-r md:block"
      data-testid="settings-navigation-rail"
    >
      <div className="flex h-full flex-col p-4">
        <div className="settings-vault-summary border-b pb-4">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">
            {t('settings.vault.title')}
          </div>
          <div className="mt-2 truncate text-sm font-semibold text-foreground">{vaultName(vaultPath)}</div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">
            {displayPath || t('settings.vault.noVault')}
          </div>
          <div className="settings-vault-state-pill mt-3 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
            <ShieldCheck size={12} />
            {isGitVault ? t('settings.vault.state.localGit') : t('settings.vault.state.localFiles')}
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1" aria-label={t('settings.title')}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSectionId === item.id
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                size="sm"
                aria-current={isActive ? 'page' : undefined}
                data-testid={`settings-nav-${item.id}`}
                onClick={() => scrollToSettingsSection(item.id, onSectionChange)}
                className={cn(
                  'settings-navigation-item h-9 w-full justify-start gap-2 rounded-md border border-transparent px-2.5 text-xs font-medium',
                  isActive
                    ? 'text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon size={15} />
                <span className="truncate">{item.label}</span>
              </Button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

/** Renders the compact iPad/mobile Settings section rail. */
export function SettingsMobileNavigation({ t, activeSectionId, onSectionChange }: Omit<SettingsNavigationProps, 'vaultPath' | 'isGitVault'>) {
  const navItems = useMemo(() => createSettingsNav(t), [t])
  const activeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [activeSectionId])

  return (
    <nav
      className="settings-mobile-navigation sticky top-0 z-10 -mx-1 mb-3 md:hidden"
      data-testid="settings-mobile-navigation"
      aria-label={t('settings.title')}
    >
      <div className="settings-mobile-navigation__rail flex gap-1 overflow-x-auto rounded-md border p-1 shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSectionId === item.id
          return (
            <Button
              key={item.id}
              ref={isActive ? activeButtonRef : undefined}
              type="button"
              variant="ghost"
              size="sm"
              aria-current={isActive ? 'page' : undefined}
              data-testid={`settings-mobile-nav-${item.id}`}
              onClick={() => scrollToSettingsSection(item.id, onSectionChange)}
              className={cn(
                'settings-navigation-item h-9 shrink-0 gap-2 rounded-md border border-transparent px-3 text-xs font-semibold',
                isActive
                  ? 'text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
