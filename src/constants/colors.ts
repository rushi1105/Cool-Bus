/**
 * BusTrack Color System
 * Centralized color tokens for the entire application.
 */

export const Colors = {
  // Brand
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  primaryFaded: 'rgba(59, 130, 246, 0.12)',

  // Semantic
  success: '#10B981',
  successLight: '#34D399',
  successFaded: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningFaded: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorLight: '#F87171',
  errorFaded: 'rgba(239, 68, 68, 0.12)',

  // Neutrals
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  dark: '#0F172A',
  darkMuted: '#334155',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',

  // Misc
  overlay: 'rgba(15, 23, 42, 0.5)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Map-specific
  mapRouteActive: '#3B82F6',
  mapRouteInactive: '#94A3B8',
  mapBusActive: '#10B981',
  mapBusInactive: '#94A3B8',
  mapStop: '#F59E0B',
  mapStopHighlight: '#EF4444',
} as const;

export type ColorToken = keyof typeof Colors;

export default Colors;
