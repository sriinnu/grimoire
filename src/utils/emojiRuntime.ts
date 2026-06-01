/**
 * Detects whether a string is a single emoji without importing the full picker
 * catalog. This keeps normal note/sidebar rendering out of unicode-emoji-json.
 */
export function isEmoji(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) return false
  if (/^[a-z][a-z0-9-]*$/.test(normalized)) return false
  if (/^\p{Regional_Indicator}{2}$/u.test(normalized)) return true
  if (/^[0-9#*]\ufe0f?\u20e3$/u.test(normalized)) return true

  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\ufe0f)(?:\p{Emoji_Modifier}|\u200d(?:\p{Emoji_Presentation}|\p{Emoji}\ufe0f)(?:\p{Emoji_Modifier})?)*$/u
  return emojiRegex.test(normalized)
}
