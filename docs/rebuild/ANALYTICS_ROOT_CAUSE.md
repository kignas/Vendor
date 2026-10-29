# Growth analytics — zero menu views and zero unique visitors

This document records the root-cause analysis for the Growth screen showing
**0 menu views / 0 unique visitors**, the fix that was safe to ship in the
vendor app, and the one piece that is genuinely blocked on the customer app.

## Symptom

`GET /vendor/analytics/visits` returned zeros for `totalViews` /
`uniqueVisitors`, and (separately) every sales/order KPI on the Growth screen
rendered blank even when the account had real orders.

## Two independent causes

### Cause 1 — frontend envelope mismatch (fixed here)

The backend wraps every vendor payload in the standard envelope:

```json
{ "success": true, "data": { "period": "7d", "summary": { … }, "daily": [ … ] } }
```

`GET /vendor/analytics` returns `{ success, data: { period, summary, statusCounts,
daily, topItems, currency } }` (`controllers/vendorController.js`
`getVendorAnalytics`). The ported page read `analytics.data.summary` — but
`analytics.data` was the **whole envelope**, so `.summary` was `undefined` and
every KPI fell back to the em dash / zero. The legacy `index.html` had done
`const d = (res && res.data) || res || {}`, and that unwrap was lost in the port.

The unit test that should have caught it stubbed the *flat* shape
(`{ summary, daily }`) instead of the real envelope, so it passed while the app
was broken against the live API.

**Fix**

- `services/api/analytics.ts` now unwraps `.data` for both `/analytics` and
  `/analytics/visits`, tolerating a flat payload too (defensive).
- `features/insights/InsightsPage.tsx` reads the unwrapped block.
- `InsightsPage.test.tsx` and a new `services/api/analytics.test.ts` now stub
  the **real** `{ success, data }` envelope, so a regression fails the suite.
- `web/scripts/mock-api.mjs` returns the real envelope, so local smoke tests
  match production.

### Cause 2 — the customer-side visit beacon is not emitted anywhere (blocked)

`GET /vendor/analytics/visits` reads `AnalyticsEvent` rows where
`scope: 'restaurant'` and `eventType` is `menu_view` / `restaurant_view`
(`services/analyticsService.js` `getRestaurantVisitAnalytics`). Those rows are
only written by the public beacon:

```
POST /api/analytics/visit   { eventType: 'menu_view', restaurantId }
```

(see `controllers/analyticsController.js` `trackVisit`, mounted at
`routes/analyticsRoutes.js`). **Nothing emits that beacon.** A search of every
accessible repository found no caller:

| Repo | Emits the visit beacon? |
| --- | --- |
| `kignas/Vendor` (this app) | no — vendor app never views its own menu |
| `kignas/Eatswada-` (backend) | defines the route only; no client |
| `kignas/eatswada-nextjs` (customer web) | **no** |
| `kignas/Eatswada-2.0`, `Nearbit`, `Nearbite-`, `Nearbite1`, `Sagnik-` | no |
| `kignas/Admin` | reads `/admin/analytics/visits`, never writes |

So the collection is empty and the metric is a **true zero**, not a display bug.
It cannot be fixed from the vendor app — the vendor is the reader, not the
writer.

**Backend/customer fix required (not performed here):**

1. Add a small fire-and-forget beacon to the customer restaurant/menu page that
   POSTs `{ eventType: 'menu_view', restaurantId }` to `/api/analytics/visit`
   when a customer opens a restaurant menu (and `restaurant_view` for the
   restaurant page). Use `navigator.sendBeacon` or a `fetch(..., { keepalive:
   true })` so it never blocks rendering, and ignore the response.
2. The endpoint already deduplicates per actor per day (unique index on
   `dedupeKey = eventType:restaurant:actor:day`), so a refresh loop cannot
   inflate the count and "unique visitors per day" is exact without any client
   state.

Until that ships, the Growth screen states the gap in plain language instead of
fabricating views (see `InsightsPage` "not being recorded yet" note and
`BACKEND-GAPS.md` §11).

## Counting method (documented, not guessed)

- **Menu views** = count of restaurant-scope `menu_view` events in the period.
- **Unique visitors** = distinct `visitorKey` values in the period. The server
  derives `visitorKey` as `u:<userId>` for logged-in users and a salted SHA-256
  of `ip + userAgent` for guests (`services/analyticsService.js` `actorKey`), so
  no IP address is stored and the same visitor counts once per day.
- **Conversion** (added on the Growth screen) = `totalOrders ÷ menu views`,
  shown only when views > 0. With a zero denominator the card is omitted rather
  than showing `0%` or `∞`.

## Verification

- `web/` `vitest run` — new `services/api/analytics.test.ts` (3 tests) and the
  rewritten `InsightsPage.test.tsx` (4 tests) pin the envelope shape.
- `web/scripts/mock-api.mjs` + headless Chromium can be used to confirm the
  screen renders real figures against the mock.
- Against staging: log in as a vendor with orders and confirm the Growth KPIs
  show the account's real numbers; views stay at 0 until the customer beacon is
  deployed.
