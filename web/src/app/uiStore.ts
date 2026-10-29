import { create } from 'zustand';

export type ConnectionState = 'online' | 'offline';
export type Theme = 'light' | 'dark';

const THEME_KEY = 'eatswada_vendor_theme';

function initialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* ignore */
  }
  return 'light';
}

function applyTheme(theme: Theme): void {
  try {
    document.documentElement.dataset.theme = theme;
  } catch {
    /* ignore */
  }
}

interface UiState {
  /** Live network reachability, driven by the browser online/offline events. */
  connection: ConnectionState;
  /** Number of unread notifications for the bell badge. */
  unreadCount: number;
  /** Light/dark theme, persisted locally. */
  theme: Theme;
  setConnection: (state: ConnectionState) => void;
  setUnreadCount: (count: number) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Small UI-only store. Server state lives in TanStack Query; this holds the few
 * cross-screen UI flags (connection pill, bell badge, theme).
 */
export const useUiStore = create<UiState>((set, get) => ({
  connection:
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online',
  unreadCount: 0,
  theme: typeof window !== 'undefined' ? initialTheme() : 'light',
  setConnection: (connection) => set({ connection }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));
