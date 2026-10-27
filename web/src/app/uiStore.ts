import { create } from 'zustand';

export type ConnectionState = 'online' | 'offline';

interface UiState {
  /** Live network reachability, driven by the browser online/offline events. */
  connection: ConnectionState;
  /** Number of unread notifications for the bell badge. */
  unreadCount: number;
  /** Id of the bottom sheet currently open, if any. */
  openSheet: string | null;
  setConnection: (state: ConnectionState) => void;
  setUnreadCount: (count: number) => void;
  openSheetById: (id: string) => void;
  closeSheet: () => void;
}

/**
 * Small UI-only store. Server state lives in TanStack Query; this holds the few
 * cross-screen UI flags (connection pill, bell badge, active sheet).
 */
export const useUiStore = create<UiState>((set) => ({
  connection: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online',
  unreadCount: 0,
  openSheet: null,
  setConnection: (connection) => set({ connection }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  openSheetById: (openSheet) => set({ openSheet }),
  closeSheet: () => set({ openSheet: null }),
}));
