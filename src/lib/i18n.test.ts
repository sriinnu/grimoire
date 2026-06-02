import { describe, expect, it } from 'vitest'
import {
  localeDisplayName,
  normalizeUiLanguagePreference,
  resolveEffectiveLocale,
  serializeUiLanguagePreference,
  translate,
} from './i18n'
import {
  DE_SETTINGS_POLISH_TRANSLATIONS,
  HI_SETTINGS_POLISH_TRANSLATIONS,
  SA_SETTINGS_POLISH_TRANSLATIONS,
  ZH_HANS_SETTINGS_POLISH_TRANSLATIONS,
} from './i18nSettingsPolishTranslations'

describe('i18n', () => {
  it('uses supported system languages before falling back to English', () => {
    expect(resolveEffectiveLocale(null, ['zh-CN'])).toBe('zh-Hans')
    expect(resolveEffectiveLocale(null, ['de-AT'])).toBe('de')
    expect(resolveEffectiveLocale(null, ['hi-IN'])).toBe('hi')
    expect(resolveEffectiveLocale(null, ['sa-Deva'])).toBe('sa')
    expect(resolveEffectiveLocale('system', ['fr-FR'])).toBe('en')
  })

  it('normalizes stored language preferences', () => {
    expect(normalizeUiLanguagePreference(' zh-cn ')).toBe('zh-Hans')
    expect(normalizeUiLanguagePreference(' de-DE ')).toBe('de')
    expect(normalizeUiLanguagePreference('hi_IN')).toBe('hi')
    expect(normalizeUiLanguagePreference('sa-Deva')).toBe('sa')
    expect(normalizeUiLanguagePreference('auto')).toBe('system')
    expect(normalizeUiLanguagePreference('fr-FR')).toBeNull()
  })

  it('serializes system preference as the settings default', () => {
    expect(serializeUiLanguagePreference('system')).toBeNull()
    expect(serializeUiLanguagePreference('zh-Hans')).toBe('zh-Hans')
    expect(serializeUiLanguagePreference('de-CH')).toBe('de')
    expect(serializeUiLanguagePreference('hi-IN')).toBe('hi')
    expect(serializeUiLanguagePreference('sa-IN')).toBe('sa')
  })

  it('falls back to English when a locale is partially translated', () => {
    expect(translate('zh-Hans', 'settings.aiAgents.description')).toBe(
      translate('en', 'settings.aiAgents.description'),
    )
  })

  it('formats locale display names in the active language', () => {
    expect(localeDisplayName('zh-Hans', 'zh-Hans')).toBe('简体中文')
    expect(localeDisplayName('en', 'zh-Hans')).toBe('英文')
    expect(localeDisplayName('de', 'de')).toBe('Deutsch')
    expect(localeDisplayName('hi', 'hi')).toBe('हिन्दी')
    expect(localeDisplayName('sa', 'sa')).toBe('संस्कृतम्')
  })

  it('keeps object-storage wording on proof boundaries instead of ready sync', () => {
    const objectStorageCopy = [
      translate('en', 'settings.portability.objectStoragePrototype'),
      translate('en', 'settings.portability.objectStoragePrototypeDescription'),
      translate('en', 'settings.portability.s3ProviderSync'),
      translate('en', 'settings.portability.s3ProviderSyncDescription'),
      translate('en', 'settings.portability.azureProviderSync'),
      translate('en', 'settings.portability.azureProviderSyncDescription'),
    ].join('\n')

    expect(objectStorageCopy).toContain('Object storage proof boundary')
    expect(objectStorageCopy).toContain('preview/apply evidence')
    expect(objectStorageCopy).toContain('live failure-state proof is still required')
    expect(objectStorageCopy).not.toMatch(/Object storage sync proof|provider SDK|Azure provider sync|Preview and apply live|provider-proven sync/)
  })

  it('localizes action-aware portability progress labels for supported languages', () => {
    const progressKeys = [
      'settings.portability.progressExportStarting',
      'settings.portability.progressStorageStarting',
      'settings.portability.progressExportCancelling',
      'settings.portability.progressStorageCancelling',
    ] as const

    for (const locale of ['zh-Hans', 'de', 'hi', 'sa'] as const) {
      for (const key of progressKeys) {
        expect(translate(locale, key)).not.toBe(translate('en', key))
      }
    }
  })

  it('localizes the portability local contract for supported languages', () => {
    const contractKeys = [
      'settings.portability.localContractTitle',
      'settings.portability.localContractMarkdown',
      'settings.portability.localContractPrivate',
      'settings.portability.localContractDesktop',
      'settings.portability.localContractProvider',
    ] as const

    for (const locale of ['zh-Hans', 'de', 'hi', 'sa'] as const) {
      for (const key of contractKeys) {
        expect(translate(locale, key)).not.toBe(translate('en', key))
      }
    }
  })

  it('localizes the local-first sync runway for supported languages', () => {
    const syncRunwayKeys = [
      'settings.sync.runway.markdown',
      'settings.sync.runway.markdownDetail',
      'settings.sync.runway.local',
      'settings.sync.runway.git',
      'settings.sync.runway.gated',
      'settings.sync.runway.releaseDetail',
    ] as const

    for (const locale of ['zh-Hans', 'de', 'hi', 'sa'] as const) {
      for (const key of syncRunwayKeys) {
        expect(translate(locale, key)).not.toBe(translate('en', key))
      }
    }
  })

  it('localizes the privacy runway for supported languages', () => {
    const privacyRunwayKeys = [
      'settings.privacy.runway.localLabel',
      'settings.privacy.runway.private',
      'settings.privacy.runway.cloudBlocked',
      'settings.privacy.runway.diagnostics',
      'settings.privacy.runway.diagnosticsDetail',
    ] as const

    for (const locale of ['zh-Hans', 'de', 'hi', 'sa'] as const) {
      for (const key of privacyRunwayKeys) {
        expect(translate(locale, key)).not.toBe(translate('en', key))
      }
    }
  })

  it('localizes the workflow runway for supported languages', () => {
    const workflowRunwayKeys = [
      'settings.workflow.runway.aria',
      'settings.workflow.runway.brief',
      'settings.workflow.runway.briefDetail',
      'settings.workflow.runway.local',
      'settings.workflow.runway.inbox',
      'settings.workflow.runway.inboxOn',
      'settings.workflow.runway.flow',
      'settings.workflow.runway.flowManual',
      'settings.workflow.runway.titles',
      'settings.workflow.runway.titlesAuto',
    ] as const

    for (const locale of ['zh-Hans', 'de', 'hi', 'sa'] as const) {
      for (const key of workflowRunwayKeys) {
        expect(translate(locale, key)).not.toBe(translate('en', key))
      }
    }
  })

  it('localizes proof-ledger shell controls for supported languages', () => {
    const proofLedgerKeys = [
      'settings.portability.proofLedgerTitle',
      'settings.portability.proofReportDialogTitle',
      'settings.portability.proofDetailsDeveloperShow',
      'settings.portability.proofCopyCopied',
      'settings.portability.proofReportInvalid',
      'settings.portability.proofHistoryLocalOnly',
      'settings.portability.proofRowObjectStorageLabel',
      'settings.portability.proofRowProviderRunnerRemaining',
      'settings.portability.proofCommandDryRunLabel',
      'settings.portability.proofLevelLiveReadOnlyPlusLocalMirror',
      'settings.portability.providerFailureMatrixTitle',
      'settings.portability.capsuleLoopTitle',
      'settings.portability.capsuleLoopStatusMissing',
      'settings.portability.capsuleLoopStepExportPreview',
      'settings.portability.capsuleLoopProofRunJson',
    ] as const

    for (const locale of ['zh-Hans', 'de', 'hi', 'sa'] as const) {
      for (const key of proofLedgerKeys) {
        expect(translate(locale, key)).not.toBe(translate('en', key))
      }
    }
  })

  it('keeps settings polish keys explicit in every supported non-English locale', () => {
    const requiredKeys = [
      'settings.aiAgents.mcpBoundary',
      'settings.aiAgents.mcpContractTitle',
      'settings.aiAgents.mcpContractReady',
      'settings.aiAgents.mcpContractTransport',
      'settings.aiAgents.mcpStatusLabel',
      'settings.aiAgents.mcpStatusChecking',
      'settings.aiAgents.mcpStatusCheckingDetail',
      'settings.aiAgents.mcpStatusInstalled',
      'settings.aiAgents.mcpStatusInstalledDetail',
      'settings.aiAgents.mcpStatusNotInstalled',
      'settings.aiAgents.mcpStatusNotInstalledDetail',
      'settings.aiAgents.mcpStatusConnect',
      'settings.aiAgents.mcpStatusManage',
      'settings.aiAgents.mcpSurfaceWriteSuggestions',
      'settings.portability.exportPreviewReviewed',
      'settings.portability.exportPreviewFormatJson',
      'settings.portability.exportPreviewFormatSqlite',
      'settings.portability.exportPreviewCounts',
      'settings.portability.exportPreviewProof',
      'settings.portability.objectStorageS3ProviderDetail',
      'settings.portability.objectStorageAzureProviderDetail',
      'settings.portability.objectStoragePreviewReady',
      'settings.portability.objectStorageLocalMirrorFixture',
      'settings.portability.objectStorageS3ProviderPreview',
      'settings.portability.objectStorageAzureProviderPreview',
      'settings.portability.objectStorageApplyProviderLock',
      'settings.portability.objectStorageApplyMirrorLock',
      'settings.portability.objectStorageNoSecretsReturned',
      'settings.portability.objectStorageS3PreflightTitle',
      'settings.portability.objectStorageAzurePreflightTitle',
      'settings.portability.objectStorageStatusCredentialsMissing',
      'settings.portability.objectStorageStatusContainerMissing',
      'settings.portability.objectStorageStatusFailed',
    ]

    for (const translations of [
      ZH_HANS_SETTINGS_POLISH_TRANSLATIONS,
      DE_SETTINGS_POLISH_TRANSLATIONS,
      HI_SETTINGS_POLISH_TRANSLATIONS,
      SA_SETTINGS_POLISH_TRANSLATIONS,
    ]) {
      expect(Object.keys(translations)).toEqual(expect.arrayContaining(requiredKeys))
    }
  })
})
