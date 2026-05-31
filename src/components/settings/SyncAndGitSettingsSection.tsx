import { GitBranch, ShieldCheck } from '@phosphor-icons/react'
import type { ReleaseChannel } from '../../lib/releaseChannel'
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

      <div
        className="settings-local-card flex items-start justify-between gap-4 rounded-md border p-4"
        data-testid="settings-git-capability"
      >
        <div className="flex gap-3">
          <div className="settings-local-card__icon mt-0.5 rounded-md border p-2">
            {isGitVault ? <GitBranch size={17} /> : <ShieldCheck size={17} />}
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
