export const EN_PRIVACY_RUNWAY_TRANSLATIONS = {
  'settings.privacy.runway.localLabel': 'Private capture',
  'settings.privacy.runway.private': 'Private by default',
  'settings.privacy.runway.localDetail': 'Recordings and transcripts stay on this machine unless cloud transcription is explicitly allowed.',
  'settings.privacy.runway.cloudAllowed': 'Cloud allowed',
  'settings.privacy.runway.cloudBlocked': 'Cloud blocked',
  'settings.privacy.runway.diagnostics': 'Diagnostics',
  'settings.privacy.runway.telemetryOptIn': 'Anonymous opt-in',
  'settings.privacy.runway.diagnosticsDetail': 'Crash and usage reports never include vault content, note titles, or file paths.',
} as const

type PrivacyRunwayKey = keyof typeof EN_PRIVACY_RUNWAY_TRANSLATIONS
type PrivacyRunwayTranslations = Partial<Record<PrivacyRunwayKey, string>>

export const ZH_HANS_PRIVACY_RUNWAY_TRANSLATIONS: PrivacyRunwayTranslations = {
  'settings.privacy.runway.localLabel': '私密捕捉',
  'settings.privacy.runway.private': '默认私密',
  'settings.privacy.runway.localDetail': '录音和转写会留在这台机器上，除非你明确允许云转写。',
  'settings.privacy.runway.cloudAllowed': '已允许云端',
  'settings.privacy.runway.cloudBlocked': '云端已阻止',
  'settings.privacy.runway.diagnostics': '诊断',
  'settings.privacy.runway.telemetryOptIn': '匿名选择加入',
  'settings.privacy.runway.diagnosticsDetail': '崩溃和使用报告绝不包含仓库内容、笔记标题或文件路径。',
}

export const DE_PRIVACY_RUNWAY_TRANSLATIONS: PrivacyRunwayTranslations = {
  'settings.privacy.runway.localLabel': 'Private Erfassung',
  'settings.privacy.runway.private': 'Standardmaessig privat',
  'settings.privacy.runway.localDetail': 'Aufnahmen und Transkripte bleiben auf diesem Geraet, bis Cloud-Transkription ausdruecklich erlaubt ist.',
  'settings.privacy.runway.cloudAllowed': 'Cloud erlaubt',
  'settings.privacy.runway.cloudBlocked': 'Cloud blockiert',
  'settings.privacy.runway.diagnostics': 'Diagnostik',
  'settings.privacy.runway.telemetryOptIn': 'Anonymes Opt-in',
  'settings.privacy.runway.diagnosticsDetail': 'Absturz- und Nutzungsberichte enthalten nie Vault-Inhalte, Notiztitel oder Dateipfade.',
}

export const HI_PRIVACY_RUNWAY_TRANSLATIONS: PrivacyRunwayTranslations = {
  'settings.privacy.runway.localLabel': 'निजी कैप्चर',
  'settings.privacy.runway.private': 'डिफ़ॉल्ट रूप से निजी',
  'settings.privacy.runway.localDetail': 'रिकॉर्डिंग और transcripts इसी मशीन पर रहते हैं, जब तक cloud transcription स्पष्ट रूप से अनुमति न हो.',
  'settings.privacy.runway.cloudAllowed': 'Cloud अनुमति',
  'settings.privacy.runway.cloudBlocked': 'Cloud अवरुद्ध',
  'settings.privacy.runway.diagnostics': 'डायग्नॉस्टिक्स',
  'settings.privacy.runway.telemetryOptIn': 'अनाम opt-in',
  'settings.privacy.runway.diagnosticsDetail': 'Crash और usage reports में vault content, note titles, या file paths कभी नहीं जाते.',
}

export const SA_PRIVACY_RUNWAY_TRANSLATIONS: PrivacyRunwayTranslations = {
  'settings.privacy.runway.localLabel': 'निजग्रहणम्',
  'settings.privacy.runway.private': 'पूर्वनियोजनेन निजम्',
  'settings.privacy.runway.localDetail': 'ध्वनिलेखाः transcription च अस्मिन् यन्त्रे तिष्ठन्ति, यावत् cloud-transcription स्पष्टतया अनुमतम् न.',
  'settings.privacy.runway.cloudAllowed': 'मेघः अनुमतः',
  'settings.privacy.runway.cloudBlocked': 'मेघः निरुद्धः',
  'settings.privacy.runway.diagnostics': 'दोषावलोकनम्',
  'settings.privacy.runway.telemetryOptIn': 'अनामिकम् opt-in',
  'settings.privacy.runway.diagnosticsDetail': 'दोष-उपयोग-वृत्तान्तेषु vault-विषयः, टिप्पणीशीर्षकं, सञ्चिकामार्गः वा कदापि न गच्छति.',
}
