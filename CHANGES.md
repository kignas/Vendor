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
