/**
 * Native push bridge. A typed, framework-agnostic port of the legacy
 * `native-push.js`. It talks to Capacitor through `window.Capacitor` so the web
 * build has no hard dependency on the native plugins: on the web (or any
 * non-native platform) every function is a safe no-op.
 *
 * Responsibilities preserved from the legacy bridge:
 *   - create the Android notification channel (sound + vibration)
 *   - register the FCM device token against POST /api/notifications/register-token
 *   - alert on a foreground push via a local notification (sound + vibration)
 *   - DEDUPLICATE so a single order does not fire repeated alerts
 *   - expose received/opened events for the app to refresh the queue
 *
 * Background and terminated delivery is handled by the Android OS from the
 * push payload; JavaScript timers cannot wake a suspended app, so we do not
 * pretend otherwise.
 */
import { NOTIFICATIONS_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';

type PushListener = { remove: () => Promise<void> | void };

interface CapacitorPush {
  requestPermissions?: () => Promise<{ receive?: string }>;
  register?: () => Promise<void>;
  createChannel?: (opts: Record<string, unknown>) => Promise<void>;
  addListener?: (event: string, cb: (arg: never) => void) => Promise<PushListener> | PushListener;
}

interface CapacitorLocal {
  createChannel?: (opts: Record<string, unknown>) => Promise<void>;
  schedule?: (opts: Record<string, unknown>) => Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    PushNotifications?: CapacitorPush;
    LocalNotifications?: CapacitorLocal;
  };
}

function capacitor(): CapacitorGlobal | undefined {
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function isNative(): boolean {
  const cap = capacitor();
  return !!cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
}

const CHANNEL_ID = 'eatswada_orders';

/** Stable positive integer id per order so repeat pushes reuse one notification. */
export function notificationId(orderId: string): number {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) hash = ((hash << 5) - hash + orderId.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}

/** Ids already alerted in this session — prevents duplicate foreground alerts. */
const alerted = new Set<string>();

export function markAlerted(orderId: string): void {
  alerted.add(orderId);
}

export function hasAlerted(orderId: string): boolean {
  return alerted.has(orderId);
}

async function registerToken(token: string): Promise<void> {
  const jwt = getToken();
  if (!token || !jwt) return;
  try {
    const res = await fetch(`${NOTIFICATIONS_BASE}/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    // Registration failure must never block the app.
  }
}

async function createChannels(): Promise<void> {
  const cap = capacitor();
  const channel = {
    id: CHANNEL_ID,
    name: 'Eatswada order alerts',
    description: 'Important order and delivery updates',
    importance: 5,
    sound: 'default',
    vibration: true,
    visibility: 1,
  };
  try {
    await cap?.Plugins?.LocalNotifications?.createChannel?.(channel);
    await cap?.Plugins?.PushNotifications?.createChannel?.(channel);
  } catch {
    /* channel creation is best-effort */
  }
}

async function alertForeground(data: Record<string, unknown>): Promise<void> {
  const cap = capacitor();
  const orderId = String(data.orderId ?? data.type ?? '');
  if (orderId && hasAlerted(orderId)) return; // dedup
  if (orderId) markAlerted(orderId);

  const title = String(data.title ?? 'Eatswada order alert');
  const body = String(data.body ?? 'A new update needs your attention.');

  try {
    await cap?.Plugins?.LocalNotifications?.schedule?.({
      notifications: [
        {
          id: orderId ? notificationId(orderId) : notificationId(String(Date.now())),
          title,
          body,
          channelId: CHANNEL_ID,
          sound: 'default',
          schedule: { at: new Date(Date.now() + 250) },
          extra: data,
        },
      ],
    });
    return;
  } catch {
    /* fall back to vibration only */
  }
  try {
    navigator.vibrate?.([400, 200, 400]);
  } catch {
    /* ignore */
  }
}

let running = false;

/**
 * Set up push. Safe to call repeatedly (idempotent). Returns a cleanup function
 * that removes the listeners it added.
 */
export async function setupPush(): Promise<() => void> {
  if (!isNative() || running) return () => undefined;
  running = true;
  const cap = capacitor();
  const Push = cap?.Plugins?.PushNotifications;
  if (!Push) {
    running = false;
    return () => undefined;
  }

  await createChannels();

  const listeners: PushListener[] = [];
  const add = async (event: string, cb: (arg: never) => void) => {
    const l = await Push.addListener?.(event, cb);
    if (l) listeners.push(l);
  };

  await add('registration', ((e: { value?: string }) => {
    if (e?.value) void registerToken(e.value);
  }) as (arg: never) => void);

  await add('registrationError', (() => undefined) as (arg: never) => void);

  await add('pushNotificationReceived', ((notification: { data?: Record<string, unknown> }) => {
    void alertForeground(notification?.data ?? {});
    window.dispatchEvent(new CustomEvent('eatswada:push-received', { detail: notification }));
  }) as (arg: never) => void);

  await add('pushNotificationActionPerformed', ((action: { notification?: { data?: unknown } }) => {
    window.dispatchEvent(
      new CustomEvent('eatswada:push-opened', { detail: action?.notification?.data ?? {} }),
    );
  }) as (arg: never) => void);

  try {
    const permission = await Push.requestPermissions?.();
    if (permission?.receive !== 'granted') {
      running = false;
      return () => {
        listeners.forEach((l) => void l.remove());
      };
    }
    await Push.register?.();
  } catch {
    /* permission/registration failure degrades gracefully */
  }

  return () => {
    listeners.forEach((l) => void l.remove());
    running = false;
  };
}
