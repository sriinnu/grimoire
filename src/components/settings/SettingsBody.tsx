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
import { useMemo, useState, type ComponentType } from 'react'
import { cn } from '../../lib/utils'
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

interface SettingsNavigationProps extends Pick<SettingsBodyProps, 't' | 'vaultPath' | 'isGitVault'> {
  activeSectionId: string
  onSectionChange: (sectionId: string) => void
}

function SettingsNavigation({ t, vaultPath, isGitVault, activeSectionId, onSectionChange }: SettingsNavigationProps) {
  const navItems = useMemo(() => createSettingsNav(t), [t])
  const handleNavClick = (sectionId: string) => {
    onSectionChange(sectionId)
    const target = document.getElementById(sectionId)
    target?.scrollIntoView?.({ block: 'start' })
  }

  return (
    <aside
      className="settings-navigation-rail hidden w-[248px] shrink-0 border-r border-border/80 bg-[color-mix(in_srgb,var(--background)_72%,var(--muted)_28%)] md:block"
      data-testid="settings-navigation-rail"
    >
      <div className="flex h-full flex-col p-4">
        <div className="settings-vault-summary border-b border-border/80 pb-4">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">
            {t('settings.vault.title')}
          </div>
          <div className="mt-2 truncate text-sm font-semibold text-foreground">{vaultName(vaultPath)}</div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">
            {vaultPath || t('settings.vault.noVault')}
          </div>
          <div className="settings-vault-state-pill mt-3 inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
            <ShieldCheck size={12} />
            {isGitVault ? t('settings.git.status.on') : t('settings.git.status.off')}
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
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'h-9 w-full justify-start gap-2 rounded-md border border-transparent px-2.5 text-xs font-medium',
                  isActive
                    ? 'border-border/80 bg-background/80 text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-background/55 hover:text-foreground',
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

/** Renders the redesigned two-pane Settings body. */
export function SettingsBody(props: SettingsBodyProps) {
  const {
    t,
    locale,
    systemLocale,
    vaultPath,
    importMarkdownFolderBusy,
    portabilityBusyAction,
    portabilityProgress,
    importPreview,
    onCancelPortabilityAction,
    onPreviewMarkdownFolder,
    onImportMarkdownFolder,
    onPreviewMarkdownZip,
    onImportMarkdownZip,
    onPreviewBear,
    onImportBear,
    onPreviewObsidian,
    onImportObsidian,
    onPreviewNotion,
    onImportNotion,
    onPreviewNotionFolder,
    onImportNotionFolder,
    onPreviewSpanda,
    onImportSpanda,
    onPreviewAppleJournal,
    onImportAppleJournal,
    onPreviewDayOne,
    onImportDayOne,
    onPreviewJourney,
    onImportJourney,
    onExportMarkdownZip,
    onExportStaticHtmlArchive,
    s3MirrorPreviewReady,
    s3MirrorPullPreviewReady,
    azureMirrorPreviewReady,
    azureMirrorPullPreviewReady,
    s3MirrorPreviewReport,
    s3MirrorPullPreviewReport,
    azureMirrorPreviewReport,
    azureMirrorPullPreviewReport,
    onPreviewS3MirrorPush,
    onApplyS3MirrorPush,
    onPreviewS3MirrorPull,
    onApplyS3MirrorPull,
    onPreviewAzureMirrorPush,
    onApplyAzureMirrorPush,
    onPreviewAzureMirrorPull,
    onApplyAzureMirrorPull,
  } = props
  const entries = props.entries
  const [activeSectionId, setActiveSectionId] = useState('settings-sync')

  return (
    <div className="flex min-h-0 flex-1">
      <SettingsNavigation
        t={t}
        vaultPath={vaultPath}
        isGitVault={props.isGitVault}
        activeSectionId={activeSectionId}
        onSectionChange={setActiveSectionId}
      />
      <div
        className="settings-main-surface min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--muted)_26%,transparent),transparent_36%)] px-4 py-3 md:px-6"
        data-testid="settings-main-surface"
      >
        <div className="settings-content-stack mx-auto flex max-w-[860px] flex-col pb-5">
          <SettingsSection id="settings-sync" showDivider={false}>
            <SyncAndGitSettingsSection {...props} />
          </SettingsSection>

          <SettingsSection id="settings-portability">
            <PortabilitySettingsSection
              t={t}
              vaultPath={vaultPath}
              entries={entries}
              vaultReady={vaultPath.trim().length > 0}
              importBusy={importMarkdownFolderBusy}
              busyAction={portabilityBusyAction}
              progress={portabilityProgress}
              importPreview={importPreview}
              onCancelProgress={onCancelPortabilityAction}
              onPreviewMarkdownFolder={onPreviewMarkdownFolder}
              onImportMarkdownFolder={onImportMarkdownFolder}
              onPreviewMarkdownZip={onPreviewMarkdownZip}
              onImportMarkdownZip={onImportMarkdownZip}
              onPreviewBear={onPreviewBear}
              onImportBear={onImportBear}
              onPreviewObsidian={onPreviewObsidian}
              onImportObsidian={onImportObsidian}
              onPreviewNotion={onPreviewNotion}
              onImportNotion={onImportNotion}
              onPreviewNotionFolder={onPreviewNotionFolder}
              onImportNotionFolder={onImportNotionFolder}
              onPreviewSpanda={onPreviewSpanda}
              onImportSpanda={onImportSpanda}
              onPreviewAppleJournal={onPreviewAppleJournal}
              onImportAppleJournal={onImportAppleJournal}
              onPreviewDayOne={onPreviewDayOne}
              onImportDayOne={onImportDayOne}
              onPreviewJourney={onPreviewJourney}
              onImportJourney={onImportJourney}
              onExportMarkdownZip={onExportMarkdownZip}
              onExportStaticHtmlArchive={onExportStaticHtmlArchive}
              s3MirrorPreviewReady={s3MirrorPreviewReady}
              s3MirrorPullPreviewReady={s3MirrorPullPreviewReady}
              azureMirrorPreviewReady={azureMirrorPreviewReady}
              azureMirrorPullPreviewReady={azureMirrorPullPreviewReady}
              s3MirrorPreviewReport={s3MirrorPreviewReport}
              s3MirrorPullPreviewReport={s3MirrorPullPreviewReport}
              azureMirrorPreviewReport={azureMirrorPreviewReport}
              azureMirrorPullPreviewReport={azureMirrorPullPreviewReport}
              onPreviewS3MirrorPush={onPreviewS3MirrorPush}
              onApplyS3MirrorPush={onApplyS3MirrorPush}
              onPreviewS3MirrorPull={onPreviewS3MirrorPull}
              onApplyS3MirrorPull={onApplyS3MirrorPull}
              onPreviewAzureMirrorPush={onPreviewAzureMirrorPush}
              onApplyAzureMirrorPush={onApplyAzureMirrorPush}
              onPreviewAzureMirrorPull={onPreviewAzureMirrorPull}
              onApplyAzureMirrorPull={onApplyAzureMirrorPull}
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
    </div>
  )
}
