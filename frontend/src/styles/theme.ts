/**
 * theme.ts — Design Token Constants
 *
 * Single source of truth for design tokens used in TypeScript/TSX contexts
 * (inline styles, Framer Motion variants, JS-driven logic).
 *
 * These values MUST stay in sync with the CSS custom properties defined in
 * globals.css and the extended theme in tailwind.config.ts.
 *
 * Rule: prefer Tailwind utility classes in JSX. Use these constants only when
 * a raw value is required — e.g. Framer Motion `style`, canvas drawing, or
 * programmatic colour manipulation.
 */

// ─── Brand Palette ────────────────────────────────────────────────────────────

export const brand = {
  50:  '#f0f4ff',
  100: '#e0eaff',
  200: '#c7d7fe',
  300: '#a5b8fc',
  400: '#818cf8',
  500: '#6366f1',   // Primary
  600: '#4f46e5',   // Primary hover
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
} as const;

// ─── Surface / Background ─────────────────────────────────────────────────────

export const surface = {
  0:   '#ffffff',
  50:  '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
} as const;

// ─── Semantic Colour Roles (light mode defaults) ──────────────────────────────

export const color = {
  bg:             '#f8fafc',
  bgElevated:     '#ffffff',
  bgSubtle:       '#f1f5f9',
  bgOverlay:      'rgba(15, 23, 42, 0.45)',

  surface:        '#ffffff',
  surfaceRaised:  '#ffffff',
  surfaceOverlay: '#ffffff',

  border:         '#e2e8f0',
  borderStrong:   '#cbd5e1',
  borderFocus:    '#6366f1',

  textPrimary:    '#0f172a',
  textSecondary:  '#475569',
  textTertiary:   '#94a3b8',
  textDisabled:   '#cbd5e1',
  textInverse:    '#ffffff',
  textBrand:      '#4f46e5',

  // Status
  successBg:   '#f0fdf4',
  success:     '#16a34a',
  successText: '#14532d',

  warningBg:   '#fffbeb',
  warning:     '#d97706',
  warningText: '#78350f',

  errorBg:     '#fef2f2',
  error:       '#dc2626',
  errorText:   '#7f1d1d',

  infoBg:      '#eff6ff',
  info:        '#2563eb',
  infoText:    '#1e3a8a',
} as const;

// ─── Shadow Presets ───────────────────────────────────────────────────────────

export const shadow = {
  xs:        '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  sm:        '0 2px 4px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  md:        '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  lg:        '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
  xl:        '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  '2xl':     '0 25px 50px -12px rgb(0 0 0 / 0.12)',
  card:      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04), inset 0 1px 0 0 rgb(255 255 255 / 0.8)',
  cardHover: '0 8px 24px -4px rgb(0 0 0 / 0.10), 0 2px 6px -2px rgb(0 0 0 / 0.06), inset 0 1px 0 0 rgb(255 255 255 / 0.8)',
  glow:      '0 0 0 3px rgb(99 102 241 / 0.15)',
  glowSm:    '0 0 0 2px rgb(99 102 241 / 0.12)',
  glowBrand: '0 4px 14px 0 rgb(99 102 241 / 0.35)',
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radius = {
  xs:   '0.25rem',    //  4px
  sm:   '0.375rem',   //  6px
  md:   '0.5rem',     //  8px
  lg:   '0.75rem',    // 12px
  xl:   '1rem',       // 16px
  '2xl': '1.25rem',   // 20px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
} as const;

// ─── Motion / Animation ───────────────────────────────────────────────────────

export const duration = {
  instant: 50,    // ms
  fast:    150,
  normal:  250,
  slow:    350,
  slower:  500,
} as const;

/** Framer Motion easing arrays (compatible with `transition.ease`) */
export const ease = {
  default: [0.4, 0, 0.2, 1]  as [number,number,number,number],
  in:      [0.4, 0, 1,   1]  as [number,number,number,number],
  out:     [0,   0, 0.2, 1]  as [number,number,number,number],
  spring:  [0.34, 1.56, 0.64, 1] as [number,number,number,number],
  snappy:  [0.2, 0, 0, 1]    as [number,number,number,number],
} as const;

// ─── Reusable Framer Motion Variant Sets ──────────────────────────────────────

/** Standard page/section fade-up entrance */
export const motionFadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal / 1000, ease: ease.default },
  },
} as const;

/** Stagger container — wrap a list of `motionFadeUp` children */
export const motionStagger = (staggerSecs = 0.07) => ({
  hidden: {},
  show:   { transition: { staggerChildren: staggerSecs } },
});

/** Scale-in for modals, dropdowns, tooltips */
export const motionScaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show:   {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.fast / 1000, ease: ease.default },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: (duration.fast - 30) / 1000, ease: ease.in },
  },
} as const;

/** Slide in from right (sidebar drawer, sheet panels) */
export const motionSlideRight = {
  hidden: { opacity: 0, x: 16 },
  show:   {
    opacity: 1,
    x: 0,
    transition: { duration: duration.normal / 1000, ease: ease.default },
  },
  exit: {
    opacity: 0,
    x: 16,
    transition: { duration: duration.fast / 1000, ease: ease.in },
  },
} as const;

// ─── Z-Index Scale ────────────────────────────────────────────────────────────

export const zIndex = {
  base:     0,
  raised:   10,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  toast:    500,
  tooltip:  600,
} as const;

// ─── Breakpoints (must match Tailwind defaults) ───────────────────────────────

export const breakpoint = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const;

// ─── Layout Constants ─────────────────────────────────────────────────────────

export const layout = {
  sidebarWidth:          228,  // px — expanded
  sidebarCollapsedWidth:  68,  // px — icon-only
  navbarHeight:           56,  // px
  maxContentWidth:      1280,  // px
  pagePaddingX:           24,  // px (1.5rem)
} as const;

// ─── Status → Style Map ───────────────────────────────────────────────────────
// Centralises badge/alert colour decisions used by multiple components.

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const statusStyles: Record<StatusVariant, {
  badge:     string;
  alert:     string;
  iconColor: string;
  dotColor:  string;
}> = {
  success: {
    badge:     'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
    alert:     'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50',
    iconColor: 'text-emerald-500',
    dotColor:  'bg-emerald-500',
  },
  warning: {
    badge:     'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50',
    alert:     'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50',
    iconColor: 'text-amber-500',
    dotColor:  'bg-amber-500',
  },
  error: {
    badge:     'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50',
    alert:     'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50',
    iconColor: 'text-red-500',
    dotColor:  'bg-red-500',
  },
  info: {
    badge:     'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50',
    alert:     'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50',
    iconColor: 'text-blue-500',
    dotColor:  'bg-blue-500',
  },
  neutral: {
    badge:     'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    alert:     'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
    iconColor: 'text-slate-400',
    dotColor:  'bg-slate-400',
  },
} as const;
