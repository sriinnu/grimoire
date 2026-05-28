import type { CSSProperties } from 'react'

export const CARD_STYLE: CSSProperties = {
  width: 'min(520px, 100%)',
  background: 'var(--background)',
  borderRadius: 12,
  border: '1px solid var(--border)',
  padding: 48,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 24,
}

export const ICON_WRAP_STYLE: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const BRAND_ICON_STYLE: CSSProperties = {
  width: 64,
  height: 64,
  display: 'block',
  borderRadius: 16,
}

export const TITLE_STYLE: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: -0.5,
  color: 'var(--foreground)',
  textAlign: 'center',
  margin: 0,
}

export const SUBTITLE_STYLE: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: 'var(--muted-foreground)',
  textAlign: 'center',
  margin: 0,
}

export const DIVIDER_STYLE: CSSProperties = {
  width: '100%',
  height: 1,
  background: 'var(--border)',
}

export const OPTION_BTN_STYLE: CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--background)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 16px',
  textAlign: 'left',
  transition: 'background 0.15s',
}

export const OPTION_ICON_STYLE: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

export const OPTION_LABEL_STYLE: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--foreground)',
  margin: 0,
}

export const OPTION_DESC_STYLE: CSSProperties = {
  fontSize: 12,
  color: 'var(--muted-foreground)',
  margin: 0,
  marginTop: 2,
}

export const ERROR_STYLE: CSSProperties = {
  fontSize: 13,
  color: 'var(--destructive)',
  textAlign: 'center',
  margin: 0,
}

export const STATUS_STYLE: CSSProperties = {
  fontSize: 13,
  color: 'var(--muted-foreground)',
  textAlign: 'center',
  margin: 0,
}

export const ERROR_BLOCK_STYLE: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
}

export const RETRY_BUTTON_STYLE: CSSProperties = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--background)',
  color: 'var(--foreground)',
  cursor: 'pointer',
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 600,
}
