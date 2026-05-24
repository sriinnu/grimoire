import {
  isCloudTranscriptionProvider,
  TRANSCRIPTION_PROVIDERS,
  type TranscriptionProviderId,
} from '../../lib/transcriptionProviders'
import { LabeledSelect, SectionHeading, SettingsSwitchRow, TelemetryToggle } from './SettingsControls'
import type { SettingsBodyProps } from './settingsTypes'

/** Renders privacy and telemetry preferences. */
export function PrivacySettingsSection({
  t,
  crashReporting,
  setCrashReporting,
  analytics,
  setAnalytics,
  transcriptionProvider,
  setTranscriptionProvider,
  cloudTranscriptionEnabled,
  setCloudTranscriptionEnabled,
}: Pick<
  SettingsBodyProps,
  | 't'
  | 'crashReporting'
  | 'setCrashReporting'
  | 'analytics'
  | 'setAnalytics'
  | 'transcriptionProvider'
  | 'setTranscriptionProvider'
  | 'cloudTranscriptionEnabled'
  | 'setCloudTranscriptionEnabled'
>) {
  const transcriptionProviderOptions = TRANSCRIPTION_PROVIDERS.map((provider) => ({
    value: provider.id,
    label: provider.label,
    disabled: isCloudTranscriptionProvider(provider.id) && !cloudTranscriptionEnabled,
  }))

  return (
    <>
      <SectionHeading
        title={t('settings.privacy.title')}
        description={t('settings.privacy.description')}
      />

      <SettingsSwitchRow
        label={t('settings.privacy.cloudTranscription')}
        description={t('settings.privacy.cloudTranscriptionDescription')}
        checked={cloudTranscriptionEnabled}
        onChange={setCloudTranscriptionEnabled}
        testId="settings-cloud-transcription"
      />

      <LabeledSelect
        label={t('settings.privacy.transcriptionProvider')}
        value={transcriptionProvider}
        onValueChange={(value) => setTranscriptionProvider(value as TranscriptionProviderId)}
        options={transcriptionProviderOptions}
        testId="settings-transcription-provider"
      />

      <TelemetryToggle
        label={t('settings.privacy.crashReporting')}
        description={t('settings.privacy.crashReportingDescription')}
        checked={crashReporting}
        onChange={setCrashReporting}
        testId="settings-crash-reporting"
      />
      <TelemetryToggle
        label={t('settings.privacy.analytics')}
        description={t('settings.privacy.analyticsDescription')}
        checked={analytics}
        onChange={setAnalytics}
        testId="settings-analytics"
      />
    </>
  )
}
