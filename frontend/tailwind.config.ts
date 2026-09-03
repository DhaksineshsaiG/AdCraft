import type { Config } from 'tailwindcss';
import forms      from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
  // ── Content paths ──────────────────────────────────────────────────────────
  // Tailwind scans these files for class names and purges everything else.
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  // ── Dark mode — toggled via .dark class on <html> ─────────────────────────
  darkMode: 'class',

  theme: {
    extend: {
      // ── Brand palette (indigo-based) ──────────────────────────────────────
      // Mirrors the --brand-* CSS variables defined in globals.css.
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#818cf8',
          500: '#6366f1',   // Primary brand
          600: '#4f46e5',   // Primary hover
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },

        // ── Surface / background scale ───────────────────────────────────────
        surface: {
          0:   '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },

      // ── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },

      // ── Border radius ──────────────────────────────────────────────────────
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      // ── Shadows — soft, premium SaaS style ────────────────────────────────
      boxShadow: {
        'soft-xs':    '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'soft-sm':    '0 2px 4px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'soft':       '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'soft-md':    '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        'soft-lg':    '0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
        'soft-xl':    '0 25px 50px -12px rgb(0 0 0 / 0.10)',
        'glow':       '0 0 0 3px rgb(99 102 241 / 0.15)',
        'glow-sm':    '0 0 0 2px rgb(99 102 241 / 0.12)',
        'glow-brand': '0 4px 14px 0 rgb(99 102 241 / 0.35)',
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04), inset 0 1px 0 0 rgb(255 255 255 / 0.8)',
        'card-hover': '0 8px 24px -4px rgb(0 0 0 / 0.10), 0 2px 6px -2px rgb(0 0 0 / 0.06), inset 0 1px 0 0 rgb(255 255 255 / 0.8)',
        'dropdown':   '0 10px 38px -10px rgb(22 23 24 / 0.35), 0 10px 20px -15px rgb(22 23 24 / 0.20)',
        'modal':      '0 25px 60px -15px rgb(0 0 0 / 0.30)',
      },

      // ── Animations — must match every @keyframes name in globals.css ───────
      animation: {
        'fade-in':        'fadeIn      0.2s ease-out both',
        'fade-up':        'fadeUp      0.3s ease-out both',
        'fade-down':      'fadeDown    0.3s ease-out both',
        'scale-in':       'scaleIn     0.2s ease-out both',
        'slide-in-right': 'slideInRight 0.25s ease-out both',
        'slide-in-left':  'slideInLeft  0.25s ease-out both',
        'shimmer':        'shimmer     1.8s ease-in-out infinite',
        'pulse-soft':     'pulseSoft   2s   cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':      'spin        3s   linear infinite',
      },

      // ── Keyframes — kept in sync with @keyframes blocks in globals.css ─────
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },

      // ── Custom timing functions ────────────────────────────────────────────
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snappy': 'cubic-bezier(0.2, 0, 0, 1)',
      },

      // ── Explicit duration steps (complements Tailwind defaults) ───────────
      transitionDuration: {
        '50':  '50ms',
        '150': '150ms',
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
      },

      // ── Spacing (complements Tailwind's default scale) ─────────────────────
      spacing: {
        '4.5': '1.125rem',   // 18px — between gap-4 and gap-5
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },

      // ── Width / Height ─────────────────────────────────────────────────────
      width: {
        'sidebar':          '15rem',    // 240px collapsed sidebar width
        'sidebar-collapsed': '4.25rem', // 68px icon-only sidebar
      },

      // ── Max-width ─────────────────────────────────────────────────────────
      maxWidth: {
        'layout': '80rem', // 1280px max page content width
      },

      // ── z-index scale (explicit, predictable) ─────────────────────────────
      zIndex: {
        '5':   '5',
        '15':  '15',
        '60':  '60',
        '70':  '70',
        '80':  '80',
        '90':  '90',
        '100': '100',
      },
    },
  },

  plugins: [
    // @tailwindcss/forms — resets browser form element styles
    forms({
      strategy: 'class', // Apply only when .form-* classes are used
    }),
    // @tailwindcss/typography — .prose classes for rich text
    typography,
  ],
} satisfies Config;
