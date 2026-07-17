import type { ReactNode } from 'react'
import type { ReleaseChannel } from '../../lib/releaseChannel'
import { desktopPlatformLabel, getDesktopPlatform, type DesktopPlatform } from '../../utils/platform'
import {
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from './primitives/SettingsGroup'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Switch } from '../ui/switch'
import { sanitizePositiveInteger } from './settingsDraft'
import type { SettingsBodyProps, SettingsTranslate } from './settingsTypes'

const PULL_INTERVAL_OPTIONS = [1, 2, 5, 10, 15, 30] as const

function autoGitSectionDescription(isGitVault: boolean, t: SettingsTranslate): string {
  return isGitVault
    ? t('settings.autogit.description.enabled')
    : t('settings.autogit.description.disabled')
}

function gitCapabilityDescription({
  hasGitMetadata,
  isGitVault,
  t,
}: {
  hasGitMetadata: boolean
  isGitVault: boolean
  t: SettingsTranslate
}): string {
  if (isGitVault) return t('settings.git.description.enabled')
  if (hasGitMetadata) return t('settings.git.description.paused')
  return t('settings.git.description.local')
}

function syncRunwaySteps({
  autoGitEnabled,
  hasGitMetadata,
  isGitVault,
  releaseChannel,
  t,
}: {
  autoGitEnabled: boolean
  hasGitMetadata: boolean
  isGitVault: boolean
  releaseChannel: ReleaseChannel
  t: SettingsTranslate
}) {
  return [
    {
      detail: t('settings.sync.runway.markdownDetail'),
      label: t('settings.sync.runway.markdown'),
      state: t('settings.sync.runway.local'),
    },
    {
      detail: hasGitMetadata ? t('settings.sync.runway.gitMetadata') : t('settings.sync.runway.gitNoMetadata'),
      label: t('settings.sync.runway.git'),
      state: isGitVault ? t('settings.git.status.on') : t('settings.git.status.off'),
    },
    {
      detail: isGitVault ? t('settings.autogit.description.enabled') : t('settings.autogit.description.disabled'),
      label: t('settings.autogit.title'),
      state: autoGitEnabled && isGitVault ? t('settings.sync.runway.armed') : t('settings.sync.runway.gated'),
    },
    {
      detail: t('settings.sync.runway.releaseDetail'),
      label: t('settings.releaseChannel'),
      state: releaseChannel === 'alpha' ? t('settings.releaseAlpha') : t('settings.releaseStable'),
    },
  ] as const
}

function sourceProofCopy(platform: DesktopPlatform, t: SettingsTranslate): string {
  if (platform === 'macos') return t('settings.releaseTruth.sourceMac')
  if (platform === 'windows') return t('settings.releaseTruth.sourceWindows')
  if (platform === 'linux') return t('settings.releaseTruth.sourceLinux')
  return t('settings.releaseTruth.sourceUnknown')
}

/** Quiet trailing status text pinned to a row's control slot. */
function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-medium text-muted-foreground">{children}</span>
}

/** Renders local-first Git capability controls and background sync preferences. */
export function SyncAndGitSettingsSection({
  t,
  pullInterval,
  setPullInterval,
  releaseChannel,
  setReleaseChannel,
  isGitVault,
  hasGitMetadata,
  gitCapabilityUpdating,
  onSetGitEnabled,
  autoGitEnabled,
  setAutoGitEnabled,
  autoGitIdleThresholdSeconds,
  setAutoGitIdleThresholdSeconds,
  autoGitInactiveThresholdSeconds,
  setAutoGitInactiveThresholdSeconds,
}: Pick<
  SettingsBodyProps,
  | 't'
  | 'pullInterval'
  | 'setPullInterval'
  | 'releaseChannel'
  | 'setReleaseChannel'
  | 'isGitVault'
  | 'hasGitMetadata'
  | 'gitCapabilityUpdating'
  | 'onSetGitEnabled'
  | 'autoGitEnabled'
  | 'setAutoGitEnabled'
  | 'autoGitIdleThresholdSeconds'
  | 'setAutoGitIdleThresholdSeconds'
  | 'autoGitInactiveThresholdSeconds'
  | 'setAutoGitInactiveThresholdSeconds'
>) {
  const platform = getDesktopPlatform()
  const platformName = desktopPlatformLabel(platform)

  return (
    <div className="settings-hig-stack">
      <SettingsSectionTitle>{t('settings.sync.title')}</SettingsSectionTitle>

      <SettingsGroup testId="settings-sync-runway" footnote={t('settings.sync.description')}>
        {syncRunwaySteps({ autoGitEnabled, hasGitMetadata, isGitVault, releaseChannel, t }).map((step) => (
          <SettingsRow key={step.label} label={step.label} description={step.detail}>
            <StatusBadge>{step.state}</StatusBadge>
          </SettingsRow>
        ))}
      </SettingsGroup>

      <SettingsGroup
        testId="settings-git-capability"
        title={t('settings.git.title')}
        footnote={gitCapabilityDescription({ hasGitMetadata, isGitVault, t })}
      >
        <SettingsRow
          testId="settings-git-enabled"
          label={t('settings.git.enable')}
          description={hasGitMetadata ? t('settings.git.enableDescription') : t('settings.git.initializeDescription')}
        >
          <StatusBadge>
            {isGitVault ? t('settings.git.status.on') : t('settings.git.status.off')}
          </StatusBadge>
          <Switch
            checked={isGitVault}
            onCheckedChange={(value) => onSetGitEnabled?.(value)}
            aria-label={t('settings.git.enable')}
            disabled={!onSetGitEnabled || gitCapabilityUpdating}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.autogit.title')}
        footnote={autoGitSectionDescription(isGitVault, t)}
      >
        <SettingsRow
          testId="settings-autogit-enabled"
          label={t('settings.autogit.enable')}
          description={t('settings.autogit.enableDescription')}
        >
          <Switch
            checked={autoGitEnabled}
            onCheckedChange={setAutoGitEnabled}
            aria-label={t('settings.autogit.enable')}
            disabled={!isGitVault}
          />
        </SettingsRow>
        <SettingsRow label={t('settings.autogit.idleThreshold')}>
          <ThresholdInput
            label={t('settings.autogit.idleThreshold')}
            value={autoGitIdleThresholdSeconds}
            onValueChange={setAutoGitIdleThresholdSeconds}
            testId="settings-autogit-idle-threshold"
            disabled={!isGitVault}
          />
        </SettingsRow>
        <SettingsRow label={t('settings.autogit.inactiveThreshold')}>
          <ThresholdInput
            label={t('settings.autogit.inactiveThreshold')}
            value={autoGitInactiveThresholdSeconds}
            onValueChange={setAutoGitInactiveThresholdSeconds}
            testId="settings-autogit-inactive-threshold"
            disabled={!isGitVault}
          />
        </SettingsRow>
        <SettingsRow label={t('settings.pullInterval')}>
          <Select
            value={`${pullInterval}`}
            onValueChange={(value) => setPullInterval(Number(value))}
            disabled={!isGitVault}
          >
            <SelectTrigger
              className="w-24 bg-transparent"
              aria-label={t('settings.pullInterval')}
              data-testid="settings-pull-interval"
              data-value={`${pullInterval}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" data-anchor-strategy="popper">
              {PULL_INTERVAL_OPTIONS.map((value) => (
                <SelectItem key={value} value={`${value}`}>
                  {`${value}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        testId="settings-release-truth"
        title={t('settings.releaseTruth.title')}
        footnote={t('settings.releaseTruth.description')}
      >
        <SettingsRow label={t('settings.releaseChannel')}>
          <Select
            value={releaseChannel}
            onValueChange={(value) => setReleaseChannel(value as ReleaseChannel)}
          >
            <SelectTrigger
              className="w-32 bg-transparent"
              aria-label={t('settings.releaseChannel')}
              data-testid="settings-release-channel"
              data-value={releaseChannel}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" data-anchor-strategy="popper">
              <SelectItem value="stable">{t('settings.releaseStable')}</SelectItem>
              <SelectItem value="alpha">{t('settings.releaseAlpha')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          label={t('settings.releaseTruth.platformLabel')}
          description={t('settings.releaseTruth.platformDetail', { platform: platformName })}
        >
          <StatusBadge>{platformName}</StatusBadge>
        </SettingsRow>
        <SettingsRow
          label={t('settings.releaseTruth.sourceLabel')}
          description={sourceProofCopy(platform, t)}
        >
          <StatusBadge>{t('settings.releaseTruth.sourceValue')}</StatusBadge>
        </SettingsRow>
        <SettingsRow
          label={t('settings.releaseTruth.packagedLabel')}
          description={t('settings.releaseTruth.packagedDetail')}
        >
          <StatusBadge>
            {releaseChannel === 'alpha' ? t('settings.releaseAlpha') : t('settings.releaseStable')}
          </StatusBadge>
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}

/** Compact positive-integer input that clamps invalid values to the last good value. */
function ThresholdInput({
  label,
  value,
  onValueChange,
  testId,
  disabled = false,
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
  testId: string
  disabled?: boolean
}) {
  return (
    <Input
      id={testId}
      type="number"
      min={1}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(sanitizePositiveInteger(Number(event.target.value), value))}
      data-testid={testId}
      aria-label={label}
      className="w-24 bg-transparent"
    />
  )
}
