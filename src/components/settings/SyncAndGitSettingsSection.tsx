import { Monitor } from '@phosphor-icons/react'
import { Glyph } from '../glyphs/Glyph'
import type { ReleaseChannel } from '../../lib/releaseChannel'
import { desktopPlatformLabel, getDesktopPlatform, type DesktopPlatform } from '../../utils/platform'
import { LabeledNumberInput, LabeledSelect, SectionHeading, SettingsSwitchRow } from './SettingsControls'
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
      tone: 'local',
    },
    {
      detail: hasGitMetadata ? t('settings.sync.runway.gitMetadata') : t('settings.sync.runway.gitNoMetadata'),
      label: t('settings.sync.runway.git'),
      state: isGitVault ? t('settings.git.status.on') : t('settings.git.status.off'),
      tone: isGitVault ? 'ready' : 'local',
    },
    {
      detail: isGitVault ? t('settings.autogit.description.enabled') : t('settings.autogit.description.disabled'),
      label: t('settings.autogit.title'),
      state: autoGitEnabled && isGitVault ? t('settings.sync.runway.armed') : t('settings.sync.runway.gated'),
      tone: autoGitEnabled && isGitVault ? 'ready' : 'gated',
    },
    {
      detail: t('settings.sync.runway.releaseDetail'),
      label: t('settings.releaseChannel'),
      state: releaseChannel === 'alpha' ? t('settings.releaseAlpha') : t('settings.releaseStable'),
      tone: releaseChannel === 'alpha' ? 'watch' : 'local',
    },
  ] as const
}

function sourceProofCopy(platform: DesktopPlatform, t: SettingsTranslate): string {
  if (platform === 'macos') return t('settings.releaseTruth.sourceMac')
  if (platform === 'windows') return t('settings.releaseTruth.sourceWindows')
  if (platform === 'linux') return t('settings.releaseTruth.sourceLinux')
  return t('settings.releaseTruth.sourceUnknown')
}

function SyncRunway({
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
  return (
    <div className="settings-sync-runway" data-testid="settings-sync-runway">
      {syncRunwaySteps({ autoGitEnabled, hasGitMetadata, isGitVault, releaseChannel, t }).map((step) => (
        <div
          key={step.label}
          className="settings-sync-runway__step"
          data-sync-runway-tone={step.tone}
        >
          <div className="settings-sync-runway__state">{step.state}</div>
          <div className="settings-sync-runway__label">{step.label}</div>
          <div className="settings-sync-runway__detail">{step.detail}</div>
        </div>
      ))}
    </div>
  )
}

function ReleaseTruthCard({
  releaseChannel,
  t,
}: {
  releaseChannel: ReleaseChannel
  t: SettingsTranslate
}) {
  const platform = getDesktopPlatform()

  return (
    <div
      className="settings-local-card grid gap-3 rounded-md border p-4"
      data-testid="settings-release-truth"
    >
      <div className="flex items-start gap-3">
        <div className="settings-local-card__icon mt-0.5 rounded-md border p-2">
          <Monitor size={17} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-[13px] font-semibold text-foreground">{t('settings.releaseTruth.title')}</div>
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            {t('settings.releaseTruth.description')}
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <ReleaseTruthMetric
          label={t('settings.releaseTruth.platformLabel')}
          value={desktopPlatformLabel(platform)}
          detail={t('settings.releaseTruth.platformDetail', { platform: desktopPlatformLabel(platform) })}
        />
        <ReleaseTruthMetric
          label={t('settings.releaseTruth.sourceLabel')}
          value={t('settings.releaseTruth.sourceValue')}
          detail={sourceProofCopy(platform, t)}
        />
        <ReleaseTruthMetric
          label={t('settings.releaseTruth.packagedLabel')}
          value={releaseChannel === 'alpha' ? t('settings.releaseAlpha') : t('settings.releaseStable')}
          detail={t('settings.releaseTruth.packagedDetail')}
        />
      </div>
    </div>
  )
}

function ReleaseTruthMetric({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="settings-material-inner rounded-md border px-2.5 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</div>
    </div>
  )
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
  return (
    <>
      <SectionHeading
        title={t('settings.sync.title')}
        description={t('settings.sync.description')}
      />

      <SyncRunway
        autoGitEnabled={autoGitEnabled}
        hasGitMetadata={hasGitMetadata}
        isGitVault={isGitVault}
        releaseChannel={releaseChannel}
        t={t}
      />

      <ReleaseTruthCard releaseChannel={releaseChannel} t={t} />

      <div
        className="settings-local-card flex items-start justify-between gap-4 rounded-md border p-4"
        data-testid="settings-git-capability"
      >
        <div className="flex gap-3">
          <div className="settings-local-card__icon mt-0.5 rounded-md border p-2">
            {isGitVault ? <Glyph name="gitHistory" size={17} /> : <Glyph name="shield" size={17} />}
          </div>
          <div className="space-y-1">
            <div className="text-[13px] font-semibold text-foreground">{t('settings.git.title')}</div>
            <div className="max-w-[480px] text-[11px] leading-relaxed text-muted-foreground">
              {gitCapabilityDescription({ hasGitMetadata, isGitVault, t })}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              {isGitVault ? t('settings.git.status.on') : t('settings.git.status.off')}
            </div>
          </div>
        </div>
        <SettingsSwitchRow
          label={t('settings.git.enable')}
          description={hasGitMetadata ? t('settings.git.enableDescription') : t('settings.git.initializeDescription')}
          checked={isGitVault}
          onChange={(value) => onSetGitEnabled?.(value)}
          disabled={!onSetGitEnabled || gitCapabilityUpdating}
          testId="settings-git-enabled"
        />
      </div>

      <SettingsSwitchRow
        label={t('settings.autogit.enable')}
        description={t('settings.autogit.enableDescription')}
        checked={autoGitEnabled}
        onChange={setAutoGitEnabled}
        disabled={!isGitVault}
        testId="settings-autogit-enabled"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledNumberInput
          label={t('settings.autogit.idleThreshold')}
          value={autoGitIdleThresholdSeconds}
          onValueChange={setAutoGitIdleThresholdSeconds}
          testId="settings-autogit-idle-threshold"
          disabled={!isGitVault}
        />
        <LabeledNumberInput
          label={t('settings.autogit.inactiveThreshold')}
          value={autoGitInactiveThresholdSeconds}
          onValueChange={setAutoGitInactiveThresholdSeconds}
          testId="settings-autogit-inactive-threshold"
          disabled={!isGitVault}
        />
      </div>

      <div className="text-[11px] leading-relaxed text-muted-foreground">
        {autoGitSectionDescription(isGitVault, t)}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledSelect
          label={t('settings.pullInterval')}
          value={`${pullInterval}`}
          onValueChange={(value) => setPullInterval(Number(value))}
          options={PULL_INTERVAL_OPTIONS.map((value) => ({
            value: `${value}`,
            label: `${value}`,
          }))}
          testId="settings-pull-interval"
          disabled={!isGitVault}
        />

        <LabeledSelect
          label={t('settings.releaseChannel')}
          value={releaseChannel}
          onValueChange={(value) => setReleaseChannel(value as ReleaseChannel)}
          options={[
            { value: 'stable', label: t('settings.releaseStable') },
            { value: 'alpha', label: t('settings.releaseAlpha') },
          ]}
          testId="settings-release-channel"
        />
      </div>
    </>
  )
}
