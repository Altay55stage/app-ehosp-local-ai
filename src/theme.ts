/**
 * eHosp Design Tokens
 * Centralized theme system for consistent UI across all screens
 */

export const Colors = {
  // Primary palette
  primary: '#10B981',
  primaryLight: 'rgba(16, 185, 129, 0.06)',
  primaryDark: '#059669',
  
  // Secondary
  secondary: '#111827',
  secondaryLight: '#F1F5F9',
  
  // Backgrounds
  background: '#F8F9FB', // Blanc cassé background
  surface: '#FFFFFF',    // Pure white cards/containers
  surfaceElevated: '#F1F5F9',
  
  // Dark mode compatibility (mapping to light tokens to enforce light off-white theme)
  dark: '#F8F9FB',
  darkSurface: '#FFFFFF',
  darkBorder: '#E2E8F0',
  
  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  
  // Text
  textPrimary: '#111827',    // Sleek dark grey/black text
  textSecondary: '#4B5563',  // Slate grey for descriptions
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',    // White text inside primary buttons
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Urgency scale (index 0-9)
  urgency: [
    '#10B981', // 0 - No urgency
    '#22C55E', // 1
    '#84CC16', // 2
    '#EAB308', // 3
    '#F97316', // 4
    '#EF4444', // 5
    '#DC2626', // 6
    '#B91C1C', // 7
    '#7F1D1D', // 8
    '#450A0A', // 9 - Maximum urgency
  ] as const,
  
  // Glass effect (adapted for light mode)
  glass: 'rgba(255, 255, 255, 0.8)',
  glassDark: 'rgba(17, 24, 39, 0.05)',
  glassBorder: 'rgba(17, 24, 39, 0.08)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const Typography = {
  // Headings
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  
  // Body
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
  },
  
  // Labels
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  
  // Button
  button: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  primary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

export const Animation = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;
