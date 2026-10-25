# TEST-REPORT.md

## How to run

```bash
cd /workspace/project/Vendor
npm install          # jsdom + Capacitor devDependencies (test-only)
npm test             # runs all three test files
```

`npm test` = `node --test tests/contract.test.mjs tests/upgrade-features.test.mjs tests/dom.smoke.test.mjs`
(Node's built-in test runner. No live backend, no network, no database.)

## Result

```
tests 44
pass  44
fail  0
cancelled 0
skipped 0
duration_ms ~3600
```

Per file:

| File | Tests | Purpose |
| --- | --- | --- |
| `tests/contract.test.mjs` | 24 | static/contract + pure helpers |
| `tests/upgrade-features.test.mjs` | 9 | new pure logic added in this upgrade |
| `tests/dom.smoke.test.mjs` | 11 | full page boot in jsdom with a fake `fetch` |

## What the tests actually prove

### contract.test.mjs (24)
- Service worker + Capacitor push files still exist and are intact.
- Auth/API/polling integration points preserved; the accept/reject/status
  request shapes are pinned (status now carries `{ status: next }`).
- Backend order statuses are not renamed or remapped.
- Security middleware assumptions not loosened (no CORS header, no
  `dangerouslySetInnerHTML`).
- Inline scripts parse as valid JavaScript; `theme.css` braces balanced.
- `--es-*` design tokens alias the existing token system.
- Pure helpers: `dietOf`, `billRows`, discount funding label,
  `billDetailsHtml`, order search, KOT escaping, speech text.
- **Capability gating**: the unsupported flags default to `false`; the
  capability set is closed to the ten known names; the flags are `Object.freeze`d
  and a write attempt is rejected; there is no `URLSearchParams` / `?cap=`
  override.
- **No vendor request hits an unmounted or admin-only route**: asserts absence
  of `/platform/settings`, `/menu/restock`, `/settlements/payouts`,
  `/settlements/payout-request`, `/vendor/payout-request`, `PUT /menu/:id`,
  `DELETE /menu/:id`.
- **Supported endpoints use their real shapes**: `/platform/public-status`,
  `/restaurant/profile` (PUT), `/menu/:id/inventory`, `/menu/availability/bulk`,
  `/orders/:id/verify-delivery-otp`, `/inventory/history`, `/settlements/*`,
  `/analytics/visits`, `autoTurnOnAt`.
- Withdrawal body carries only `amount` (no unsupported `note`); no dead `wdNote` input.
- Duplicate-action guards present; print root is the only printable node.

### upgrade-features.test.mjs (9) — new
- `nextOpeningAt`: next scheduled opening today, skipping closed days and
  today-past-open, and `null` when no schedule exists.
- `restockTimestampFor`: `2h`/`4h`/`next_open` produce real future timestamps;
  `manual` produces `null`.
- `isSelfDeliveryOrder`: the restaurant's **current** mode wins (matching the
  server's 409 gate); falls back to the order snapshot only before the
  restaurant loads.
- `platformFlagsOf`: reads only the public-status whitelist; never invents a
  flag; `codDisabled` is true only on an explicit `isCodEnabled:false`.
- `renderMenuCard`: withholds Edit/Delete while their caps are off; shows the
  stock quantity only for items that track stock.

### dom.smoke.test.mjs (11)
Boots the real `index.html` in jsdom with a fake `fetch` and drives the UI:
- dashboard boots and renders the order + kitchen workflow;
- a legacy order with no optional fields still renders;
- the restock panel points at the per-item control and sends **no** bulk
  request;
- a crafted `?cap=` URL cannot enable an unverified capability or reach its
  endpoint (no `/complaints` request);
- a self-delivery order shows the PIN button and verifies through
  `POST /orders/:id/verify-delivery-otp` with `{ otp }`;
- an eatswada-rider order never shows the PIN button;
- the platform banner reflects `/platform/public-status`;
- finance reads the vendor settlement summary and never calls an admin route;
- settings save sends only `maxActiveOrders` + `settlementSchedule`;
- the profile editor writes through `PUT /restaurant/profile`;
- the per-item inventory sheet posts `stockQuantity` to
  `PUT /menu/:id/inventory`.

## Regression fixes

| Regression | Cause | Fix |
| --- | --- | --- |
| `auth, API client and polling…` failed | pinned the old bodiless `PUT /orders/:id/status` | updated the assertion to the real `{ status: next }` body |
| `restock controls stay disabled…` (dom) | test asserted the old "Not available yet" text | rewritten to assert the per-item `autoTurnOnAt` model and that no bulk request is sent |
| `?cap= URL…` (dom) | same old text | rewritten to assert the gated panel and zero `/complaints` calls |
| `an eatswada-rider order never shows the PIN button` (dom) | stub restaurant was `self_delivery`, which now correctly shows the button | stub now sets the restaurant's current mode to `eatswada_rider` |

## Honest limits

- These are static/unit/DOM tests. They do **not** prove end-to-end behaviour
  against a live backend or database. No production system was contacted.
- The DOM tests use a fake `fetch`; they prove the app builds the right
  requests, not that the server accepts them.
- Backend routes were verified by reading the source, not by calling the live
  service.

## Manual/next-step verification (not performed here)

1. Run against a staging backend with a real vendor account and confirm each
   screen loads (queue, history pages, menu, inventory, finance, analytics,
   settings, support, notifications).
2. Confirm a second vendor account cannot see the first vendor's orders or
   finances (ownership is enforced server-side; the app sends only its token).
3. Confirm the 15-second undo-ready window and the +5-minute prep extension
   behave against the live timers.
