import {
  Cloud,
  AppWindow,
  GearSix,
  GitBranch,
  PaintBrush,
  Robot,
  ShieldCheck,
  Translate,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import { AppearanceSettingsSection } from '../AppearanceSettingsSection'
import { NativeSettingsSection } from '../NativeSettingsSection'
import { PortabilitySettingsSection } from '../PortabilitySettingsSection'
import { Button } from '../ui/button'
import { SettingsSection } from './SettingsControls'
import { AiAgentSettingsSection } from './AiAgentSettingsSection'
import { LanguageSettingsSection } from './LanguageSettingsSection'
import { PrivacySettingsSection } from './PrivacySettingsSection'
import { SyncAndGitSettingsSection } from './SyncAndGitSettingsSection'
import { WorkflowSettingsSection } from './WorkflowSettingsSection'
import type { SettingsBodyProps } from './settingsTypes'

type SettingsNavItem = {
  id: string
  label: string
  icon: ComponentType<IconProps>
}

function createSettingsNav(t: SettingsBodyProps['t']): SettingsNavItem[] {
  return [
    { id: 'settings-sync', label: t('settings.sync.title'), icon: GitBranch },
    { id: 'settings-portability', label: t('settings.portability.title'), icon: Cloud },
    { id: 'settings-appearance', label: t('settings.appearance.title'), icon: PaintBrush },
    { id: 'settings-workflow', label: t('settings.workflow.title'), icon: GearSix },
    { id: 'settings-agents', label: t('settings.aiAgents.title'), icon: Robot },
    { id: 'settings-language', label: t('settings.language.title'), icon: Translate },
    { id: 'settings-native', label: t('settings.native.title'), icon: AppWindow },
    { id: 'settings-privacy', label: t('settings.privacy.title'), icon: ShieldCheck },
  ]
}

function vaultName(vaultPath: string): string {
  return vaultPath.split('/').filter(Boolean).pop() ?? 'Local Vault'
}

function SettingsNavigation({ t, vaultPath, isGitVault }: Pick<SettingsBodyProps, 't' | 'vaultPath' | 'isGitVault'>) {
  const navItems = createSettingsNav(t)
  const handleNavClick = (sectionId: string) => {
    const target = document.getElementById(sectionId)
    target?.scrollIntoView?.({ block: 'start' })
  }

  return (
    <aside className="hidden w-[236px] shrink-0 border-r border-border bg-muted/40 p-4 md:block">
      <div className="mb-5 rounded-md border border-border bg-background/65 p-3">
        <div className="text-[11px] font-bold uppercase text-muted-foreground" style={{ letterSpacing: '0.08em' }}>
          {t('settings.vault.title')}
        </div>
        <div className="mt-2 truncate text-sm font-semibold text-foreground">{vaultName(vaultPath)}</div>
        <div className="mt-1 truncate text-[11px] text-muted-foreground">{vaultPath || t('settings.vault.noVault')}</div>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          <ShieldCheck size={12} />
          {isGitVault ? t('settings.git.status.on') : t('settings.git.status.off')}
        </div>
      </div>

      <nav className="flex flex-col gap-1" aria-label={t('settings.title')}>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleNavClick(item.id)}
              className="h-8 w-full justify-start px-2.5 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <Icon size={15} />
              <span className="truncate">{item.label}</span>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}

/** Renders the redesigned two-pane Settings body. */
export function SettingsBody(props: SettingsBodyProps) {
  const {
    t,
    locale,
    systemLocale,
    vaultPath,
    importMarkdownFolderBusy,
    onImportMarkdownFolder,
    onImportMarkdownZip,
    onImportBear,
    onImportDayOne,
    onImportJourney,
    onExportMarkdownZip,
  } = props

  return (
    <div className="flex min-h-0 flex-1">
      <SettingsNavigation t={t} vaultPath={vaultPath} isGitVault={props.isGitVault} />
      <div className="min-w-0 flex-1 overflow-auto px-6 py-2">
        <SettingsSection id="settings-sync" showDivider={false}>
          <SyncAndGitSettingsSection {...props} />
        </SettingsSection>

        <SettingsSection id="settings-portability">
          <PortabilitySettingsSection
            t={t}
            vaultPath={vaultPath}
            vaultReady={vaultPath.trim().length > 0}
            importBusy={importMarkdownFolderBusy}
            onImportMarkdownFolder={onImportMarkdownFolder}
            onImportMarkdownZip={onImportMarkdownZip}
            onImportBear={onImportBear}
            onImportDayOne={onImportDayOne}
            onImportJourney={onImportJourney}
            onExportMarkdownZip={onExportMarkdownZip}
          />
        </SettingsSection>

        <SettingsSection id="settings-appearance">
          <AppearanceSettingsSection {...props} />
        </SettingsSection>

        <SettingsSection id="settings-workflow">
          <WorkflowSettingsSection {...props} />
        </SettingsSection>

        <SettingsSection id="settings-agents">
          <AiAgentSettingsSection {...props} />
        </SettingsSection>

        <SettingsSection id="settings-language">
          <LanguageSettingsSection
            t={t}
            locale={locale}
            systemLocale={systemLocale}
            uiLanguage={props.uiLanguage}
            setUiLanguage={props.setUiLanguage}
          />
        </SettingsSection>

        <SettingsSection id="settings-native">
          <NativeSettingsSection
            t={t}
            menuBarIconEnabled={props.menuBarIconEnabled}
            setMenuBarIconEnabled={props.setMenuBarIconEnabled}
          />
        </SettingsSection>

        <SettingsSection id="settings-privacy">
          <PrivacySettingsSection {...props} />
        </SettingsSection>
      </div>
    </div>
  )
}
