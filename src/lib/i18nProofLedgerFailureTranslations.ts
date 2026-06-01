import type { TranslationKey } from './i18n'

type LocaleTranslations = Partial<Record<TranslationKey, string>>

export const ZH_HANS_PROOF_LEDGER_FAILURE_TRANSLATIONS: LocaleTranslations = {
  'settings.portability.providerFailureMatrixAria': '对象存储失败状态覆盖',
  'settings.portability.providerFailureMatrixTitle': '失败状态覆盖',
  'settings.portability.providerFailureMatrixDetail': '只有从脱敏报告加载真实 S3/Azure 通过与失败状态后，提供商同步才可被证明。',
  'settings.portability.providerFailureMatrixSummary': '已记录 {recorded}/{total}',
  'settings.portability.providerFailureMatrixRecorded': '已记录',
  'settings.portability.providerFailureMatrixNeeded': '需要',
  'settings.portability.providerFailureMatrixPassed': '成功路径',
  'settings.portability.providerFailureMatrixConfig': '设置/配置',
  'settings.portability.providerFailureMatrixAuth': '认证/登录失败',
  'settings.portability.providerFailureMatrixPermission': '权限失败',
  'settings.portability.providerFailureMatrixConflict': '冲突失败',
  'settings.portability.providerFailureMatrixNetwork': '网络/重试失败',
  'settings.portability.providerFailureMatrixCleanup': '清理失败',
}

export const DE_PROOF_LEDGER_FAILURE_TRANSLATIONS: LocaleTranslations = {
  'settings.portability.providerFailureMatrixAria': 'Objektspeicher-Fehlerzustandsabdeckung',
  'settings.portability.providerFailureMatrixTitle': 'Fehlerzustandsabdeckung',
  'settings.portability.providerFailureMatrixDetail': 'Provider-Sync bleibt unbewiesen, bis echte S3/Azure-Pass- und Fehlerzustände aus redigierten Berichten geladen sind.',
  'settings.portability.providerFailureMatrixSummary': '{recorded} von {total} erfasst',
  'settings.portability.providerFailureMatrixRecorded': 'erfasst',
  'settings.portability.providerFailureMatrixNeeded': 'nötig',
  'settings.portability.providerFailureMatrixPassed': 'Erfolgspfad',
  'settings.portability.providerFailureMatrixConfig': 'Setup/Konfig',
  'settings.portability.providerFailureMatrixAuth': 'Auth/Login-Fehler',
  'settings.portability.providerFailureMatrixPermission': 'Berechtigungsfehler',
  'settings.portability.providerFailureMatrixConflict': 'Konfliktfehler',
  'settings.portability.providerFailureMatrixNetwork': 'Netzwerk/Retry-Fehler',
  'settings.portability.providerFailureMatrixCleanup': 'Cleanup-Fehler',
}

export const HI_PROOF_LEDGER_FAILURE_TRANSLATIONS: LocaleTranslations = {
  'settings.portability.providerFailureMatrixAria': 'ऑब्जेक्ट स्टोरेज failure-state coverage',
  'settings.portability.providerFailureMatrixTitle': 'Failure-state कवरेज',
  'settings.portability.providerFailureMatrixDetail': 'वास्तविक S3/Azure pass और failure states redacted reports से लोड होने तक provider sync सिद्ध नहीं है.',
  'settings.portability.providerFailureMatrixSummary': '{total} में से {recorded} recorded',
  'settings.portability.providerFailureMatrixRecorded': 'recorded',
  'settings.portability.providerFailureMatrixNeeded': 'needed',
  'settings.portability.providerFailureMatrixPassed': 'happy path',
  'settings.portability.providerFailureMatrixConfig': 'setup/config',
  'settings.portability.providerFailureMatrixAuth': 'auth/login failure',
  'settings.portability.providerFailureMatrixPermission': 'permission failure',
  'settings.portability.providerFailureMatrixConflict': 'conflict failure',
  'settings.portability.providerFailureMatrixNetwork': 'network/retry failure',
  'settings.portability.providerFailureMatrixCleanup': 'cleanup failure',
}

export const SA_PROOF_LEDGER_FAILURE_TRANSLATIONS: LocaleTranslations = {
  'settings.portability.providerFailureMatrixAria': 'object storage failure-state coverage',
  'settings.portability.providerFailureMatrixTitle': 'failure-state आवरणम्',
  'settings.portability.providerFailureMatrixDetail': 'यावत् redacted reports तः सत्य S3/Azure pass/failure states न आगच्छन्ति, provider sync न सिद्धम्.',
  'settings.portability.providerFailureMatrixSummary': '{total} मध्ये {recorded} recorded',
  'settings.portability.providerFailureMatrixRecorded': 'recorded',
  'settings.portability.providerFailureMatrixNeeded': 'needed',
  'settings.portability.providerFailureMatrixPassed': 'happy path',
  'settings.portability.providerFailureMatrixConfig': 'setup/config',
  'settings.portability.providerFailureMatrixAuth': 'auth/login failure',
  'settings.portability.providerFailureMatrixPermission': 'permission failure',
  'settings.portability.providerFailureMatrixConflict': 'conflict failure',
  'settings.portability.providerFailureMatrixNetwork': 'network/retry failure',
  'settings.portability.providerFailureMatrixCleanup': 'cleanup failure',
}
