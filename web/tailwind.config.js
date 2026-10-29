/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Every token resolves to a theme-aware CSS variable so light/dark
           both work and opacity modifiers (`bg-brand/10`) still compile. */
        canvas: 'rgb(var(--es-canvas) / <alpha-value>)',
        card: 'rgb(var(--es-card) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--es-ink) / <alpha-value>)',
          soft: 'rgb(var(--es-ink-soft) / <alpha-value>)',
          faint: 'rgb(var(--es-ink-faint) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--es-border) / <alpha-value>)',
          soft: 'rgb(var(--es-border-soft) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--es-success) / <alpha-value>)',
          ink: 'rgb(var(--es-success-ink) / <alpha-value>)',
          bg: 'rgb(var(--es-success-bg) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--es-warning) / <alpha-value>)',
          ink: 'rgb(var(--es-warning-ink) / <alpha-value>)',
          bg: 'rgb(var(--es-warning-bg) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--es-danger) / <alpha-value>)',
          ink: 'rgb(var(--es-danger-ink) / <alpha-value>)',
          bg: 'rgb(var(--es-danger-bg) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--es-info) / <alpha-value>)',
          ink: 'rgb(var(--es-info-ink) / <alpha-value>)',
          bg: 'rgb(var(--es-info-bg) / <alpha-value>)',
        },
        star: 'rgb(var(--es-star) / <alpha-value>)',
        /* `brand` is the fixed burgundy for filled buttons with white text;
           `brand-ink` is the accent for text/borders, which lightens in dark mode. */
        brand: {
          DEFAULT: 'rgb(var(--es-brand) / <alpha-value>)',
          soft: 'rgb(var(--es-brand-soft) / <alpha-value>)',
          ink: 'rgb(var(--es-brand-ink) / <alpha-value>)',
        },
        ivory: 'rgb(var(--es-ivory) / <alpha-value>)',
        scrim: 'rgb(var(--es-scrim) / <alpha-value>)',
        inverse: {
          DEFAULT: 'rgb(var(--es-inverse) / <alpha-value>)',
          ink: 'rgb(var(--es-inverse-ink) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
        pill: '9999px',
      },
      maxWidth: {
        app: '480px',
      },
      minHeight: {
        tap: '44px',
      },
      minWidth: {
        tap: '44px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '250ms',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.96)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        /* New-order arrival: a short attention pulse, not a continuous loop. */
        'attention-pulse': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.015)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'slide-up': 'slide-up 200ms ease-out both',
        'fade-in': 'fade-in 180ms ease-out both',
        'scale-in': 'scale-in 180ms ease-out both',
        'pop-in': 'pop-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'attention-pulse': 'attention-pulse 700ms ease-in-out 2',
      },
    },
  },
  plugins: [],
};
