# Incoming-order acceptance experience — migration record

Increment on top of the `web/` React + TypeScript migration (see
`PORTING_MAP.md`, `OPEN_QUESTIONS.md`, `AGENTS.md`). No backend change; the
production API URL is untouched. Verified against a local staging API that
mirrors the documented `VENDOR-API-CONTRACT.md` shapes.

## 1. What was already in place (not duplicated)

The order lifecycle already existed and was reused: `GET /orders?view=queue`,
`PUT /orders/:id/accept {prepMinutes, prepTimeMinutes}`, `PUT /orders/:id/reject
{reason}`, the 15 s queue poll, single-flight mutations, the new-order chime +
vibration (`orderAlarm`), the Android notification channel and FCM bridge, the
prep-deadline helpers, the KOT/voice/support tools, and the RiderStatus strip.
The acceptance increment changed the *experience* and hardened the countdown;
it did not re-implement any of the above.

## 2. Screen-by-screen classification (this increment)

| Screen / control | Status | Notes |
| --- | --- | --- |
| New-order banner (`NewOrderBanner`) | 1 — migrated | Ports legacy `#alarmBar`: count copy, Stop control, auto-hide when nothing waits. |
| Reliable sound/haptic alert | 1 — migrated (existing) | `orderAlarm` chime + `navigator.vibrate`; gesture-unlock preserved. Banner does not own audio. |
| Order card details (qty, instructions, total, payment) | 1 — migrated (existing) | Item `n×`, customer note, server total + payment pill. Never invented. |
| Preparation-time selector (minus/plus) | 1 — migrated | New `AcceptOrderSheet` stepper + quick chips; bounds 5–120 in 5-min steps; legacy 15/20/25/30 preserved. |
| Reject + green Accept | 1 — migrated | Reject = outlined danger, Accept = green (`--es-success`). |
| Acceptance countdown | 1 — migrated | `useAcceptanceWindow`: server `restaurantResponseDeadline`, else created+5 min (legacy parity). No deadline → no countdown, buttons stay enabled. |
| Duplicate-tap prevention | 1 — migrated | `useOrderActions` single-flight per id; sheet disables both buttons while busy. |
| Accept → Preparing from server response | 1 — migrated | On success the queue is invalidated; the card moves to Preparing only from the refetched server state. |
| Payment status on the acceptance sheet | 4 — new backend capability required | The sheet shows items + note; the server total/payment pill lives on the card. Surfacing bill + payment inside the sheet needs a stable documented field set (already on the card). |
| Acceptance deadline policy | 3 — new UI on existing capability | Countdown relies on `restaurantResponseDeadline`; when the backend omits it the created+5 min fallback is used. |

## 3. Backend capabilities

No missing endpoint was invented. `PUT /orders/:id/accept` and
`PUT /orders/:id/reject` are the existing contract routes and are used
unchanged. The only backend-dependent behaviour is the acceptance deadline: the
UI shows a countdown **only** when a deadline is derivable, and otherwise keeps
the actions enabled and lets the server decide.

## 4. Verification

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npx vitest run` (web/) — 22 files, 129 tests, all pass
- `npm test` (repo root, legacy) — 44 tests, 32 pass, 1 fail, 11 skipped.
  The single failure (`unsupported backend features are capability-gated`,
  `tests/contract.test.mjs:180`) is the **pre-existing baseline drift**
  documented in memory (legacy `caps` has 17 flags; the contract pins 10). It
  reproduces on a clean `main` and is not caused by this increment.
- End-to-end (headless Chromium against a staging API): Accept fires exactly
  **one** `PUT /orders/:id/accept` despite three rapid taps; the order leaves
  the New tab and appears in Preparing from the refetched queue.

### Verified

- Banner copy/count, Stop control, and hide-when-empty.
- Stepper minus/plus + quick chips change the KPT that is sent.
- Single-flight accept (one request per order id).
- Order transitions to Preparing only from the server refetch.
- Countdown renders when a deadline exists and is absent when none does.
- Expired window disables Accept and shows the expired copy.

### Untested in this environment

- Real Android device: native push (foreground/background/terminated), the
  notification channel sound/vibration, and haptics. Not claimed as validated.
- Real production/staging backend (only a local staging-shaped mock was used).
- The `--build` Android APK packaging on a machine with the Android SDK.
