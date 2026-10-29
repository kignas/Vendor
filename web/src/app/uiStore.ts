import { create } from 'zustand';

export type ConnectionState = 'online' | 'offline';
/** Resolved theme actually applied to the document. */
export type Theme = 'light' | 'dark';
/** What the user chose: an explicit theme, or follow the system. */
export type ThemePreference = Theme | 'system';

const THEME_KEY = 'eatswada_vendor_theme';
const THEME_COLOR: Record<Theme, string> = { light: '#F4F5F7', dark: '#17171A' };

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  } catch {
    /* ignore */
  }
  return 'system';
}

function resolveTheme(pref: ThemePreference): Theme {
  return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

/** Keep the Android/browser status bar and the theme-color meta in step. */
export function applyTheme(theme: Theme): void {
  try {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
    const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
      .Capacitor;
    const statusBar = cap?.Plugins?.StatusBar as
      | { setBackgroundColor?: (o: { color: string }) => void; setStyle?: (o: { style: string }) => void }
      | undefined;
    statusBar?.setBackgroundColor?.({ color: THEME_COLOR[theme] });
    statusBar?.setStyle?.({ style: theme === 'dark' ? 'DARK' : 'LIGHT' });
  } catch {
    /* ignore */
  }
}

interface UiState {
  /** Live network reachability, driven by the browser online/offline events. */
  connection: ConnectionState;
  /** Number of unread notifications for the bell badge. */
  unreadCount: number;
  /** The user's stored choice (may be `system`). */
  themePreference: ThemePreference;
  /** The resolved theme actually applied. */
  theme: Theme;
  setConnection: (state: ConnectionState) => void;
  setUnreadCount: (count: number) => void;
  setThemePreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
}

/**
 * Small UI-only store. Server state lives in TanStack Query; this holds the few
 * cross-screen UI flags (connection pill, bell badge, theme).
 */
export const useUiStore = create<UiState>((set, get) => {
  const initialPref = typeof window !== 'undefined' ? readPreference() : 'system';
  return {
    connection:
      typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online',
    unreadCount: 0,
    themePreference: initialPref,
    theme: resolveTheme(initialPref),
    setConnection: (connection) => set({ connection }),
    setUnreadCount: (unreadCount) => set({ unreadCount }),
    setThemePreference: (themePreference) => {
      const theme = resolveTheme(themePreference);
      applyTheme(theme);
      try {
        window.localStorage.setItem(THEME_KEY, themePreference);
      } catch {
        /* ignore */
      }
      document.documentElement.dataset.themePreference = themePreference;
      set({ themePreference, theme });
    },
    toggleTheme: () => {
      // Toggling from `system` commits to the opposite of what is showing.
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      get().setThemePreference(next);
    },
  };
});

/**
 * Keep `system` preference live: if the OS scheme changes while the user is on
 * `system`, re-resolve. No-op once the user picks an explicit theme.
 */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    const { themePreference, setThemePreference } = useUiStore.getState();
    if (themePreference === 'system') setThemePreference('system');
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
