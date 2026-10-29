import { orderRef } from '@/features/orders/orderDomain';
import type { Order } from '@/types/order';

/**
 * Voice readout (Web Speech API). Mirrors the legacy `speakOrder`: optional and
 * feature-detected, offered only for languages the device has a voice for, and
 * repeated calls replace the current utterance rather than stacking.
 */
const SPEAK_LANGS = [
  { code: 'en-IN', label: 'English', match: /^en/i },
  { code: 'bn-IN', label: 'বাংলা', match: /^bn/i },
  { code: 'hi-IN', label: 'हिन्दी', match: /^hi/i },
];

export function speechAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

function installedSpeakLangs() {
  if (!speechAvailable()) return [];
  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = window.speechSynthesis.getVoices() || [];
  } catch {
    voices = [];
  }
  return SPEAK_LANGS.filter((l) => voices.some((v) => l.match.test(v.lang || '')));
}

export function buildOrderSpeech(order: Order): string {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemText = items.map((i) => `${Number(i.quantity) || 1} ${i.name || ''}`).join(', ');
  const name = order.customerName || order.user?.name || 'customer';
  return `Order ${orderRef(order)}. ${name}. ${itemText}.`;
}

export type SpeakResult = 'spoken' | 'unsupported' | 'no-voice';

/** Speaks the order. Returns why it could not, so the caller can toast. */
export function speakOrder(order: Order): SpeakResult {
  if (!speechAvailable()) return 'unsupported';
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  const langs = installedSpeakLangs();
  const utterance = new window.SpeechSynthesisUtterance(buildOrderSpeech(order));
  const preferred = langs.find((l) => l.match.test(navigator.language || '')) || langs[0];
  if (preferred) {
    utterance.lang = preferred.code;
    const voices = window.speechSynthesis.getVoices() || [];
    const voice =
      voices.find((v) => v.lang === preferred.code) ||
      voices.find((v) => preferred.match.test(v.lang || ''));
    if (voice) utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
  return preferred ? 'spoken' : 'no-voice';
}
