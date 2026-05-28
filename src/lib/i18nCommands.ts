import { interpolate, localeDisplayName, type AppLocale, type TranslationValues } from './i18nCore'

const EN_COMMAND_TRANSLATIONS = {
  'command.noMatches': 'No matching commands',
  'command.palettePlaceholder': 'Type a command...',
  'command.footerNavigate': '↑↓ navigate',
  'command.footerSelect': '↵ select',
  'command.footerClose': 'esc close',
  'command.footerSend': '↵ send',
  'command.aiMode': '{agent} mode',
  'command.openSettings': 'Open Settings',
  'command.openSettings.keywords': 'preferences config appearance theme themes constellation daylight atelier living archive nocturne retro terminal',
  'command.openLanguageSettings': 'Open Language Settings',
  'command.openLanguageSettings.keywords': 'language locale i18n internationalization localization chinese english 中文',
  'command.useSystemLanguage': 'Use System Language',
  'command.switchToEnglish': 'Switch Language to English',
  'command.switchToChinese': 'Switch Language to Simplified Chinese',
  'command.openH1Setting': 'Open H1 Auto-Rename Setting',
  'command.contribute': 'Contribute',
  'command.checkUpdates': 'Check for Updates',
} as const

export type CommandTranslationKey = keyof typeof EN_COMMAND_TRANSLATIONS

const ZH_HANS_COMMAND_TRANSLATIONS: Partial<Record<CommandTranslationKey, string>> = {
  'command.noMatches': '没有匹配的命令',
  'command.palettePlaceholder': '输入命令...',
  'command.footerNavigate': '↑↓ 导航',
  'command.footerSelect': '↵ 选择',
  'command.footerClose': 'esc 关闭',
  'command.footerSend': '↵ 发送',
  'command.aiMode': '{agent} 模式',
  'command.openSettings': '打开设置',
  'command.openSettings.keywords': '设置 偏好 配置 外观 主题 constellation daylight atelier living archive nocturne retro terminal',
  'command.openLanguageSettings': '打开语言设置',
  'command.openLanguageSettings.keywords': '语言 区域 i18n 国际化 本地化 中文 english',
  'command.useSystemLanguage': '使用系统语言',
  'command.switchToEnglish': '切换到英文',
  'command.switchToChinese': '切换到简体中文',
  'command.openH1Setting': '打开 H1 自动重命名设置',
  'command.contribute': '参与贡献',
  'command.checkUpdates': '检查更新',
}

const COMMAND_TRANSLATIONS: Record<AppLocale, Partial<Record<CommandTranslationKey, string>>> = {
  en: EN_COMMAND_TRANSLATIONS,
  'zh-Hans': ZH_HANS_COMMAND_TRANSLATIONS,
}

/** Translate command-palette and command-registry chrome without loading Settings translations. */
export function translateCommand(locale: AppLocale, key: CommandTranslationKey, values?: TranslationValues): string {
  const template = COMMAND_TRANSLATIONS[locale]?.[key] ?? EN_COMMAND_TRANSLATIONS[key]
  return interpolate(template, values)
}

/** Create a command-only translator for hot command registration paths. */
export function createCommandTranslator(locale: AppLocale) {
  return (key: CommandTranslationKey, values?: TranslationValues) => translateCommand(locale, key, values)
}

export { localeDisplayName }
