import { SectionHeading, SettingsSwitchRow } from './SettingsControls'
import type { SettingsBodyProps } from './settingsTypes'

/** Renders Inbox and title workflow preferences. */
export function WorkflowSettingsSection({
  t,
  initialH1AutoRename,
  setInitialH1AutoRename,
  explicitOrganization,
  setExplicitOrganization,
  autoAdvanceInboxAfterOrganize,
  setAutoAdvanceInboxAfterOrganize,
}: Pick<
  SettingsBodyProps,
  | 't'
  | 'initialH1AutoRename'
  | 'setInitialH1AutoRename'
  | 'explicitOrganization'
  | 'setExplicitOrganization'
  | 'autoAdvanceInboxAfterOrganize'
  | 'setAutoAdvanceInboxAfterOrganize'
>) {
  return (
    <>
      <SectionHeading
        title={t('settings.workflow.title')}
        description={t('settings.workflow.description')}
      />

      <SettingsSwitchRow
        label={t('settings.workflow.explicit')}
        description={t('settings.workflow.explicitDescription')}
        checked={explicitOrganization}
        onChange={setExplicitOrganization}
        testId="settings-explicit-organization"
      />

      <SettingsSwitchRow
        label={t('settings.workflow.autoAdvance')}
        description={t('settings.workflow.autoAdvanceDescription')}
        checked={autoAdvanceInboxAfterOrganize}
        onChange={setAutoAdvanceInboxAfterOrganize}
        testId="settings-auto-advance-inbox-after-organize"
      />

      <SettingsSwitchRow
        label={t('settings.titles.autoRename')}
        description={t('settings.titles.autoRenameDescription')}
        checked={initialH1AutoRename}
        onChange={setInitialH1AutoRename}
        testId="settings-initial-h1-auto-rename"
      />
    </>
  )
}
