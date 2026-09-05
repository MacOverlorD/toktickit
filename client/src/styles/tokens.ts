import type { CSSProperties } from 'react'

export const zenGreenTokens = {
  primary: '#006B3C',
  secondary: '#0B7A46',
  paleGreen: '#EAF6EF',
  page: '#F5F7F6',
  surface: '#FFFFFF',
  text: '#18211D',
  textMuted: '#54635B',
  border: '#CDD6D1',
  readonly: '#EEF2EF',
  error: '#842029',
  errorBackground: '#FBEAEC',
  warning: '#805B10',
  warningBackground: '#FFF4D6',
  success: '#135C35',
  successBackground: '#EAF6EF',
  focus: '#0B7A46',
} as const

export const responsiveBreakpoints = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 991,
  desktopMin: 992,
} as const

export const zenGreenCssProperties = {
  '--color-primary': zenGreenTokens.primary,
  '--color-secondary': zenGreenTokens.secondary,
  '--color-pale-green': zenGreenTokens.paleGreen,
  '--color-page': zenGreenTokens.page,
  '--color-surface': zenGreenTokens.surface,
  '--color-text': zenGreenTokens.text,
  '--color-text-muted': zenGreenTokens.textMuted,
  '--color-border': zenGreenTokens.border,
  '--color-readonly': zenGreenTokens.readonly,
  '--color-error': zenGreenTokens.error,
  '--color-error-bg': zenGreenTokens.errorBackground,
  '--color-warning': zenGreenTokens.warning,
  '--color-warning-bg': zenGreenTokens.warningBackground,
  '--color-success': zenGreenTokens.success,
  '--color-success-bg': zenGreenTokens.successBackground,
  '--color-focus': zenGreenTokens.focus,
} as CSSProperties
