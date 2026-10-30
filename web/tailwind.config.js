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
        fast: 'var(--es-dur-fast)',
        base: 'var(--es-dur-base)',
        slow: 'var(--es-dur-slow)',
        sheet: 'var(--es-dur-sheet)',
      },
      /* Override Tailwind's `ease-out` with our token and add `ease-spring`, so a
         duration/easing class is always a token, never a hard-coded value. */
      transitionTimingFunction: {
        out: 'var(--es-ease-out)',
        spring: 'var(--es-ease-spring)',
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
        /* Allowed infinite #1 (with the bar pulse): the chevron on the new-order
           bar bobs gently while orders wait. */
        'chevron-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        /* Allowed infinite #1: a soft pulse on the new-order bar while waiting. */
        'bar-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.88' },
        },
        /* Short wiggle for the notification bell when a new notification arrives. */
        'bell-wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-12deg)' },
          '40%': { transform: 'rotate(10deg)' },
          '60%': { transform: 'rotate(-6deg)' },
          '80%': { transform: 'rotate(4deg)' },
        },
        /* Draw-in for the success tick (stroke-dashoffset shrinks to 0). */
        'tick-draw': {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        /* Allowed infinite #2: the storefront sign's signal waves pulse softly. */
        'signal-wave': {
          '0%, 100%': { opacity: '0.25', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.12)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s var(--es-ease-out) infinite',
        'slide-up': 'slide-up var(--es-dur-base) var(--es-ease-out) both',
        'fade-in': 'fade-in var(--es-dur-base) var(--es-ease-out) both',
        'scale-in': 'scale-in var(--es-dur-base) var(--es-ease-out) both',
        'pop-in': 'pop-in var(--es-dur-slow) var(--es-ease-spring) both',
        'attention-pulse': 'attention-pulse 700ms var(--es-ease-out) 2',
        'chevron-bob': 'chevron-bob 1.4s var(--es-ease-out) infinite',
        'bar-pulse': 'bar-pulse 1.6s var(--es-ease-out) infinite',
        'bell-wiggle': 'bell-wiggle 600ms var(--es-ease-out) 1',
        'tick-draw': 'tick-draw 400ms var(--es-ease-out) both',
        'signal-wave': 'signal-wave 2.4s var(--es-ease-out) infinite',
      },
    },
  },
  plugins: [],
};
