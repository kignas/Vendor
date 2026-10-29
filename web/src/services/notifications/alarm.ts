/**
 * New-order alarm: a two-tone chime (Web Audio) plus a short vibration burst.
 * This is a faithful port of the legacy `Alarm` IIFE in index.html.
 *
 * The audio context is created lazily and only after a user gesture
 * (`unlock()`), because Android/most browsers block autoplay audio until the
 * page has been interacted with. The vibration uses the Web Vibration API,
 * which the Capacitor Android WebView honours.
 *
 * It is deliberately a small, self-contained singleton: a single interval and
 * a single AudioContext, both cleaned up on `stop()`.
 */

type Listener = (active: boolean) => void;

class OrderAlarm {
  private ctx: AudioContext | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private listeners = new Set<Listener>();

  /** Must be called from a user gesture to satisfy the autoplay policy. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* audio unavailable — the alarm degrades to vibration only */
    }
  }

  private chime(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const tones: [number, number][] = [
      [880, 0],
      [1245, 0.18],
    ];
    for (const [freq, offset] of tones) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      const t = now + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }

  private pulse(): void {
    this.chime();
    try {
      if (navigator.vibrate) navigator.vibrate([350, 130, 350]);
    } catch {
      /* vibration unsupported */
    }
  }

  /** Start (or continue) the repeating alarm. Idempotent. */
  start(_count?: number): void {
    this.unlock();
    if (this.active) return;
    this.active = true;
    this.pulse();
    this.ticker = setInterval(() => this.pulse(), 2200);
    this.emit();
  }

  /** Stop the alarm and clear the interval. */
  stop(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    if (this.active) {
      this.active = false;
      this.emit();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.active);
  }

  /** One-off short haptic acknowledgement for a successful action. */
  tap(): void {
    try {
      if (navigator.vibrate) navigator.vibrate(20);
    } catch {
      /* ignore */
    }
  }
}

export const orderAlarm = new OrderAlarm();
