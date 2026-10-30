# CHANGES.md

Vendor App upgrade aligned to the verified Eatswada backend contract.
Baseline: `main` (pristine `Nearbite-main` import). Work branch:
`upgrade/vendor-backend-aligned`.

Guiding rule: **inspect the backend before touching a feature; never invent an
endpoint, field, or status; never fake a server-side save.** Every endpoint
named below was read out of `routes/vendorRoutes.js` and its controller.

## 1. Fixed calls that hit the wrong or a non-existent endpoint

| Area | Before | After |
| --- | --- | --- |
| Platform status | `GET /platform/settings` (admin-only → 403) | `GET /platform/public-status` (public, `optionalAuth`) |
| Analytics | read a flat/guessed shape | `data.summary` with `totalOrders, deliveredOrders, cancelledOrders, deliveredFoodSales, averageDeliveredOrderValue` |
| Finance | guessed settlement fields | `eligibleBalance`, `availableForWithdrawal`, `activePayoutRequest` from `/settlements/summary` |
| Payout history | `/settlements/payouts`, `/settlements/payout-request`, `/vendor/payout-request` (all absent/admin) | `/settlements/withdrawals` (own `PayoutRequest` rows) |
| Withdrawal | fake route | `POST /settlements/withdraw` with `{ amount? }` |
| Withdrawal note | sent a `note` field the backend never reads | removed; the backend accepts only `amount` (blank = full eligible balance) |
| Restock | `/menu/restock` (absent) | `PUT /menu/:id/toggle-stock` with `autoTurnOnAt` |
| Order advance | `PUT /orders/:id/status` with **no body** | body `{ status: next }`; target derived from the server's own transition map |
| Notifications | device-local read set only | server `readAt` is the source of truth; local set is an optimistic cache |
| Complaints | `GET /complaints`, `POST /complaints/:id/dispute` (absent) | gated off with an explicit gap message; disputes route to Support |

## 2. New backend-supported features

- **Order history pagination** — `GET /orders?view=history&page=&limit=20`
  with a "Load older orders" control and a "Showing N of M" note. The live
  queue stays uncapped (the backend only paginates the history view).
- **Per-item inventory** — `PUT /menu/:id/inventory` sheet
  (`stockQuantity`, `trackStock`, `lowStockThreshold`, `inStock`). Quantity is
  shown on the card only when the item actually tracks stock.
- **Stock history** — `GET /inventory/history?itemId=`.
- **Bulk availability** — `PUT /menu/availability/bulk` (`{ itemIds, inStock }`).
- **Auto-restock** — per-item `autoTurnOnAt` through `toggle-stock`; the card
  shows the scheduled restock time.
- **Profile editor** — writes `PUT /restaurant/profile` (vendor allow-list);
  reads `GET /restaurant` / `GET /vendor/profile`.
- **Operational settings** — `GET/PUT /vendor/settings`; the app sends only
  `maxActiveOrders` and `settlementSchedule` (the two writable fields).
- **Self-delivery PIN verification** — `POST /orders/:id/verify-delivery-otp`,
  shown only when the restaurant's current mode is self-delivery.
- **Menu item create** — `POST /vendor/menu` (create-only; the backend marks
  new items `pending` for admin approval).

## 3. Ownership, permissions and duplicate-tap safety

- Every call goes through `apiFetch`, which sends the bearer token and routes
  401 to `handleUnauthorized()`. All vendor routes are `protect` +
  `role('vendor')` and are scoped to the caller's restaurant server-side.
- Actions are single-flight per order/entity: `state.actionBusy`,
  `v2.bulkBusy`, `state.reviewReplyBusy`, `v2.otpBusy`, `state.disputeBusy`.
  A double tap cannot fire a request twice.
- Loading, empty, network-error and unauthorized states are handled for every
  new surface (skeleton/`state-panel`, retry buttons, toast on error).

## 4. Capability gating

A frozen `caps` object gates anything the backend does not support. `false`
means no request and no invented figure. No URL/query override exists, so a
crafted link cannot enable an unverified request. See `VENDOR-API-CONTRACT.md`
and `BACKEND-GAPS.md`.

## 5. Preservation

- UI, theme, auth, polling, push (`sw.js`, `firebase-messaging-sw.js`,
  `native-push*.js`), Capacitor config and Android packaging are untouched.
- No order status was renamed or remapped.
- Existing tests were kept and extended, not deleted.

## 6. Tests

- `tests/contract.test.mjs` — extended to the verified capability set, the real
  request shapes, and a **mounted-route allow-list** that checks every vendor
  path the app calls against the backend route table (see `TEST-REPORT.md`).
- `tests/upgrade-features.test.mjs` — **new**: pure-logic tests for
  `nextOpeningAt`, `restockTimestampFor`, `isSelfDeliveryOrder`,
  `platformFlagsOf`, `renderMenuCard`.
- `tests/dom.smoke.test.mjs` — **extended**: OTP flow, rider-order gating,
  platform banner, finance, settings save allow-list, profile write, inventory
  sheet, and the gated-`?cap=` guard.
- `package.json` `test` script now runs all three files.

## 7. Files changed

```
config.js                  (+6)
index.html                 (major)
package.json               (test script)
tests/contract.test.mjs    (updated to verified contract)
tests/dom.smoke.test.mjs   (extended)
tests/upgrade-features.test.mjs  (new)
.gitignore                 (new)
VENDOR-API-CONTRACT.md     (new)
CHANGES.md                 (new)
TEST-REPORT.md             (new)
BACKEND-GAPS.md            (new)
```

---

# Rebuild branch `rebuild/phase-2-orders` — analytics, dashboard, order feedback

The React/TypeScript rebuild (`web/`) is the source of truth on this branch.
This section records the changes made on `rebuild/phase-2-orders`.

## 1. Growth analytics: root cause and fix

The Growth screen showed **zero** for every sales/order KPI, and menu
views / unique visitors were zero. Two independent causes:

1. **Envelope mismatch (fixed).** The backend wraps payloads in
   `{ success, data: { … } }`. `InsightsPage` read `envelope.summary` instead of
   `envelope.data.summary`, so every KPI fell back to the em dash. The unit test
   stubbed a *flat* shape, so it passed while the live screen was broken.
   `services/api/analytics.ts` now unwraps `.data` for both `/analytics` and
   `/analytics/visits`; the page reads the unwrapped block; tests stub the real
   envelope; `web/scripts/mock-api.mjs` returns it too.
2. **No visit beacon (blocked upstream).** `GET /analytics/visits` reads
   `menu_view` / `restaurant_view` rows written only by `POST /api/analytics/visit`,
   which **no client emits** in any accessible repo. The zero is real and is
   stated as such. See `docs/rebuild/ANALYTICS_ROOT_CAUSE.md` and
   `BACKEND-GAPS.md` §11 for the exact customer-side fix.

Added on the Growth screen: conversion rate (`orders ÷ views`, omitted when the
denominator is zero), and an honest note when views are not being recorded.

## 2. Home dashboard (`GET /vendor/dashboard`, `/alerts`, `/activity`)

The Home screen previously used only the earnings summary + queue, leaving the
mounted `/dashboard`, `/alerts` and `/activity` routes unused. Home now shows
today's orders, delivered sales, average order value, pending settlement, an
alert summary (out-of-stock / low-stock / awaiting review), the live queue
counts, recent activity and one-tap shortcuts to every operational screen.

## 3. Order confirmation feedback

After the server confirms an accept or reject, a short `SuccessFlash` plays
(haptic tap via `orderAlarm.tap()`), then auto-dismisses. It renders only on a
resolved mutation — a test holds the accept response open to prove the flash
never appears before the server confirms, and it never delays the request.
Reduced-motion collapses the animation to an instant state.

## 4. Support ticket categories

`POST /vendor/support` silently coerces any unrecognised `category` to `other`.
The picker offered categories the backend does not accept (`general`, `orders`,
`payments`, `settlements`, `menu`), so the vendor's choice was discarded. The
list now matches `createVendorSupportTicket`'s allow-list exactly.

## 5. Legacy files restored

The branch had deleted `theme.css`, `sw.js`, `apply.html` and
`application-status.html` while `index.html` / `login.html` still reference
them and the root test suite reads `theme.css` / `sw.js`. They are restored from
`main` (AGENTS.md rule 10: do not delete the old HTML before Phase 7). The root
suite is back to **44/44**.

## 6. Tests

- `web/` `vitest`: 195 tests pass (30 files), including new
  `services/api/analytics.test.ts`, `features/home/HomePage.test.tsx`, and
  rewritten `InsightsPage.test.tsx` that pins the real envelope.
- Root `node --test tests/*.mjs`: 44 pass.
- `web/` `typecheck`, `lint`, `build`: clean.


---

# Phase 3 — Zomato Restaurant Partner layout (`web/`)

Phase 3 restyles the React app to the reference layout (Orders-first, mostly
monochrome, colour reserved for status/meaning). No endpoint, field, order status
or number was invented; every mutation stays single-flight and the three auth
localStorage keys are unchanged. Steps 1–10, one commit each:

- **Step 1 — Navigation and routes.** Orders is the landing screen (`/` →
  `/orders`). Bottom nav is Orders · Inventory · Business · Feedback · History.
  `InventoryHubPage` (Menu | Stock) and `BusinessHubPage` (Insights | Finance)
  are segmented hubs; `/menu`, `/insights` and `/finance` redirect into them.
  HomePage kept at `/home`, reachable from the header grid as "Overview".
- **Step 2 — Header.** Availability pill (the single availability control), search
  and the header grid sheet.
- **Step 3 — Orders structure.** Group chips (Preparing · Ready · Picked up, plus
  Scheduled only while it has orders) with live counts, and a flat order list.
- **Step 4 — New-order bar and sheet.** Fixed green bar ("You have N new
  order(s)", tap or swipe up) that opens the restyled accept sheet: green header
  band, ID + copy, item rows, Total Bill with a PAID/COD chip and expandable
  breakdown, prep-time stepper, and a Reject | Accept (mm:ss) footer whose fill
  drains with the acceptance window. Countdown only when the server sent a
  deadline; "1 of N" paging when several orders wait. The alarm, vibration and
  window-expiry refresh are preserved from the previous banner.
- **Step 5 — Order card.** Flat card with item detail sheet, prep/rider strips,
  kebab actions (Print KOT, Read aloud, Get help) and an expandable bill.
- **Step 6 — Info-carousel.** Real-data-only cards (alerts, settlement, profile)
  with a per-day dismissal under the new key `eatswada_vendor_dismissed_cards`.
- **Step 7 — Profile nudge and help bubble.** Nudge shown only for a field the
  contract returns and that is present-but-blank; floating help bubble with an
  optional support number from `VITE_SUPPORT_PHONE` (hidden when unset).
- **Step 8 — Empty states.** Availability-aware Orders empty states with our own
  `StorefrontIllustration` and a Resume / Turn on Online action where the status
  allows it.
- **Step 9 — Visual polish.** Shared dark toast pill (`AppToaster`), 150–250ms
  motion, 44px tap targets, contrast fixes (readable text moved to `ink-soft`),
  colour roles (blue forward / green accept / danger-outline reject / crimson
  active chip) and light + dark verification.
- **Step 10 — Docs and cleanup.** `AGENTS.md` navigation/design/folder sections
  updated; this entry; `DesignPage` gallery extended; dead code removed; test
  audit closed.
- **Step 11 — Animations and motion.** A motion pass with no logic change.
  `src/lib/motion.ts` is the single source of easing/duration tokens (mirrored in
  `index.css` and `tailwind.config.js`, asserted by `motion.test.ts`). Sheets use
  Framer Motion (`AnimatePresence`, drag-to-dismiss), the new-order bar slides in
  with a chevron bob, the bottom nav has a sliding indicator + badge pop, chips
  crossfade their counts (`AnimatedCount`), the order list enters/exits with
  stable keys (`AnimatedListItem`), Accept/Ready fills drain via `scaleX`, the
  success tick draws in, and skeletons shimmer. All motion is `motion-safe:` /
  reduced-motion-aware and animates transform/opacity only. At most two infinite
  animations app-wide (new-order bar pulse, storefront signal waves).

## Tests

- `web/` `vitest`: **46 files, 346 tests pass** (nav + redirects, chip counts,
  new-order bar and sheet rules, one-of-N paging, countdown fill, stepper bounds,
  order-card actions, bill expand, carousel dismissal/next-day, profile nudge,
  help bubble, empty-state variants, motion tokens + reduced-motion fallbacks,
  bottom-nav indicator transform).
- `web/` `typecheck`, `lint`, `build`: clean.
