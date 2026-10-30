# Analytics redesign — Step 0 audit

Branch: `rebuild/phase-2-orders` (source of truth for this work).
Backend audited read-only: `kignas/Eatswada-` @ `main` (cloned to `/tmp/eatswada-audit/backend`, never modified).
Vendor app: `/workspace/project/Vendor/web` (React 18 + TS + Vite).

This is the audit required before any code was written. It records the existing
analytics page, the defects found, the **real** backend contracts (paths, params,
response shapes, auth), the reusable components, the risks and the phased plan.

---

## 1. The vendor panel exists

- The panel is the repo root: legacy plain HTML/JS (`index.html`, `login.html`,
  `apply.html`, `theme.css`, `config.js`) wrapped by Capacitor into the Android
  APK (`appId com.eatswada.vendor`).
- The UI is being rebuilt in `web/` (React + TypeScript + Vite). All work for
  this task happens inside `web/`.

## 2. Stack (followed exactly)

| Concern | What the panel uses |
| --- | --- |
| Framework | React 18, TypeScript strict, Vite 6 |
| Router | React Router v6 **HashRouter** (`src/app/AppRouter.tsx`) |
| Navigation | Bottom nav, exactly 5 destinations: Orders · Inventory · Business · Feedback · History. Business is a hub with an **Insights | Finance** segmented control. |
| State | TanStack Query v5 for server state; Zustand for small UI state only |
| API client | `src/lib/api.ts` `apiFetch()` — prefixes `VITE_API_ORIGIN/api/vendor`, sends `Authorization: Bearer <nearbite_vendor_token>`, 401 → clear + `#/login` |
| Auth storage | `src/lib/auth.ts` — `nearbite_vendor_token` / `_user` / `_restaurant` (fixed keys) |
| Styling | Tailwind CSS v3 + design tokens (`theme.css`, `src/index.css`, `tailwind.config.js`) |
| Chart library | **None used by the analytics page today.** The page uses hand-rolled inline SVG (`LineChart`, `GradientBarChart`, `DonutChart`, `Sparkline`). `recharts` is a dependency but is only used by the dev-only `DesignPage`. |
| Components | shadcn-style primitives in `src/components/ui`, shared components in `src/components` |
| Tests | Vitest + React Testing Library + MSW (`src/test/server.ts`) |

## 3. The existing analytics page

- **File**: `web/src/features/insights/InsightsPage.tsx` (299 lines).
- **Route**: rendered as the **Insights** segment of `/business`
  (`BusinessHubPage.tsx`). Legacy `/insights` redirects to `/business`; `/finance`
  to `/business?seg=finance`. The bottom-nav entry is **Business**.
- **What it shows today**: a period tab strip (Today / 7 days / 30 days); a 2×2
  KPI grid (Total orders, Sales, Avg order value, Cancellation rate) with
  previous-period deltas; a "last 7 days orders" gradient bar card; a Sales-trend
  line card with a duplicate period `<select>`; payment-method and veg/non-veg
  donuts; Top dishes (with sparkline), Worst sellers, Peak hours; two extra
  "Menu views" / "Unique visitors" KPI cards; a zero-views honesty note; and a
  "comparison appears once the aggregated endpoint is deployed" note.
- **Endpoints it calls** (via `services/api/analytics.ts`):
  1. `GET /vendor/analytics/overview?period=` — **does not exist on the backend**
     (confirmed: no route, no controller). The call 404s and the code falls back.
  2. `GET /vendor/analytics?period=` — exists.
  3. `GET /vendor/analytics/visits?period=` — exists.

### Defects found in the existing page

| # | Defect | Detail |
| --- | --- | --- |
| D1 | **Primary endpoint is invented** | The page's whole design is built on `GET /vendor/analytics/overview`, which the backend does not mount. Every load therefore takes the 404 fallback path. The "comparison and mix charts" (previous period, payment mix, diet mix, worst items, peak hours) never render in production. This is the single biggest defect. |
| D2 | **No date-range presets beyond 3 fixed chips** | Only Today/7d/30d. No 90d (which `/analytics` supports), no custom range (which `/analytics/visits` supports via `from`/`to`). |
| D3 | **No "last updated" / no refresh control** | The user cannot tell how fresh the data is, and cannot force a refresh. |
| D4 | **No traffic trend** | Views and unique visitors are shown only as two static cards. There is no views/visitors-over-time chart even though `GET /analytics/visits` returns a `daily` series. |
| D5 | **No funnel** | Item views, add-to-cart, checkout-initiated, completed and cancelled are all returned by `/analytics/visits` but none are shown as a funnel. |
| D6 | **No most-viewed items table** | `mostViewedItems` (name, views, add-to-cart, engagement) is returned but not rendered. |
| D7 | **No performance / ranking card** | `GET /vendor/performance` exists and is never called. |
| D8 | **Cancellation colour logic is not inverted** | `KpiCard` colours a negative delta red and a positive delta green. For cancellations, *down is good* — the existing tile paints an improvement red. |
| D9 | **Duplicate period control** | A tab strip **and** a `<select>` in the Sales-trend card drive the same state. |
| D10 | **Views note is over-eager** | The "not being recorded yet" note keys on `totalViews === 0` only, and it sits at the very bottom of the page below unrelated charts. |
| D11 | **No per-widget error isolation** | One query feeds the whole page; any failure blanks everything (one `ErrorState` for the page). |
| D12 | **No sorting** | Top/worst item lists are unsorted and un-sortable. |
| D13 | **Metric definitions are absent** | No tooltip explains "conversion" or "item engagement" or the word "attributed". |
| D14 | **No CSV export** (acceptable — no backend endpoint; listed as a gap). |

### Client-side calculations to review

The page's helpers (`analyticsDomain.ts`) compute: `percentChange`, `cancellationRatePct`,
`kpiTiles`, `donutSegments`, `sparklinePath`. Of these, **`percentChange`,
`cancellationRatePct` and `kpiTiles` are client-side analytics calculations** —
exactly what the task forbids when the backend already returns the value. The
backend *does* return `comparison.*ChangePct` and `summary.conversionRate`, so the
redesign reads those and stops recomputing. `donutSegments`/`sparklinePath` are
pure presentation geometry (arc/path coordinates), not analytics, and are kept.

## 4. Real backend contracts (verified in source, not guessed)

Router: `routes/vendorRoutes.js`, mounted by `server.js` at `/api/vendor` **and**
`/api/v1/vendor`. Every route below is `protect` + `role('vendor')` and scoped to
`req.user.restaurantId`. Auth failures are `401` (expired) / `403` (wrong role).

### 4.1 `GET /vendor/analytics/visits?period=`  → `analyticsController.getVendorMenuAnalytics`

`period` whitelist: `'7d' | '90d' | 'all' | 'today'` else `'30d'` (see
`analyticsService.periodDays`). Also accepts `from`/`to` ISO dates
(`periodBounds`), but the vendor route only forwards `period` — **custom range is
a gap for the vendor route** (see §6).

Response (`{ success:true, data: { … } }`), from `getRestaurantVisitAnalytics`:

```
{
  period,
  range: { from, to },
  summary: {
    totalViews, uniqueVisitors,
    today: { views, uniqueVisitors },
    week:  { views, uniqueVisitors },
    month: { views, uniqueVisitors },
    itemViews, addToCart, removeFromCart, checkoutInitiated,
    completedOrders, cancelledOrders, refunds,
    conversionRate,               // completed attributed / unique menu visitors × 100
    revenue, averageOrderValue,
    attribution: { windowHours }  // e.g. 24
  },
  comparison: {
    previous: { totalViews, uniqueVisitors, completedOrders, conversionRate },
    viewsChangePct, uniqueVisitorsChangePct,
    completedOrdersChangePct, conversionRateChangePct
  },
  daily: [ { day: 'YYYY-MM-DD', views, uniqueVisitors } ],
  byEventType: [ { eventType, count } ],
  topItems: [ { menuItemId, name, price, views, addToCart, engagement } ],  // up to 10
  mostViewedItems: [ … top 5 of topItems … ]
}
```

Key semantics:
- **Views** = `restaurant_view` + `menu_view` events (restaurant scope).
- **Unique visitors** = distinct `visitorKey` (salted hash; no IP stored).
- **Completed/cancelled/refunds** come from server-authoritative order outcome
  events (`models/Order.js` hooks), not from a client beacon.
- **conversionRate** and **engagement** are computed server-side.
- Empty restaurant → `emptyRestaurantAnalytics()` (all zeros, empty arrays).
- **403** if `req.user.role !== 'vendor'` or no `restaurantId`.

### 4.2 `GET /vendor/analytics?period=` → `vendorController.getVendorAnalytics`

`period` whitelist: `'7d' | '30d' | '90d' | 'all'` else `'30d'`.

```
{ success, data: {
  period,
  summary: { totalOrders, deliveredOrders, cancelledOrders,
             deliveredFoodSales, averageDeliveredOrderValue },
  statusCounts: [ { status, count } ],
  daily: [ { date, orders, deliveredSales } ],
  topItems: [ { name, quantity, sales } ],   // top 5 by quantity
  currency: 'INR'
} }
```

This is the order-side companion to the visit analytics. No previous-period block
(confirmed) — the comparison must come from `/analytics/visits`.

### 4.3 `GET /vendor/performance` → `vendorController.getVendorPerformance`

Read-only. Recomputes the snapshot on read only if none exists.

```
{ success, data: {
  restaurantId, name,
  score,               // 0–100, two decimals
  dataConfidence,      // 0–1: share of weights backed by enough data
  isNewRestaurant,     // true when not enough order history
  computedAt,          // ISO or null
  factors: [ { key, label, weight, normalised (0–1), raw (mixed|null), hasData } ],
  sample:  { orders, completed, cancelled, reviews, complaints, refunds,
             repeatOrders, avgRating, avgPrepMinutes, lateOrders } | null,
  availability: { class, orderable, reason, label },
  ranking: { featured, pinned, sponsored, sponsorLabel }
} }
```

`factors[].key` ∈ `ratings | completion | preparation | cancellation | complaints |
repeat | recent` (`services/restaurantPerformanceService.js`). The factor
`label`s are returned verbatim; the redesign renders them and does not invent
thresholds. `availability.class` ∈ `orderable | busy | temporarily_closed |
closed_today | outside_hours | suspended | unapproved | inactive | unknown`
(`services/restaurantAvailability.js`). `ranking.sponsored` is only set for
sponsored restaurants; `sponsorLabel` defaults to `'Sponsored'`.

### 4.4 Finance / settlement (vendor-scoped)

| Endpoint | Shape used |
| --- | --- |
| `GET /vendor/earnings/summary?period=today\|7d\|30d\|all` | `{ period, currency, current, lifetime, settlement }` |
| `GET /vendor/earnings/orders?view=completed\|in_progress\|all&page=&limit=` | `{ data: [ { id, orderNumber, status, paymentMethod, createdAt, foodSales, commissionRate, commission, restaurantNetAmount, commissionSource } ], pagination }` |
| `GET /vendor/settlements/summary` | `{ currency, settlementSchedule, joinDate, eligibleBalance, availableForWithdrawal, activePayoutRequest }` |
| `GET /vendor/settlements/withdrawals` | own `PayoutRequest` rows |
| `POST /vendor/settlements/withdraw` | `{ amount? }` |

The per-order **base settlement** the task asks for is `foodSales` (the agreed
base menu amount) with `commission`, `restaurantNetAmount` and `commissionSource`
returned per order. There is **no** vendor-facing ledger/statement route (the
`/settlements/restaurants/:id/statement` route is **admin-only**) and no
vendor-facing refund/adjustment line — see §6.

## 5. Reusable components (reused, not duplicated)

`KpiCard`, `ChartCard`, `EmptyState`, `ErrorState`, `Skeleton*`, `SegmentedControl`,
`ScrollTabs`, `StatusPill`, `BottomSheet`, `Sheet`, `AnimatedCount`, and the
inline-SVG charts `LineChart`, `GradientBarChart`, `DonutChart`, `Sparkline`.
`lib/format.ts` (`formatMoney`, `formatMoney2`, `firstNumber`, `enumLabel`) is the
single money/number formatter. No new library is added: the existing inline-SVG
charts cover the traffic trend and sparkline needs; adding Recharts to the
analytics page would duplicate a capability the panel already has.

## 6. Backend gaps / contract mismatches (NOT fixed here — listed, per rules)

1. **`GET /vendor/analytics/overview` does not exist.** The current page depends
   on it. The redesign drops the invented endpoint and builds only on
   `/analytics` + `/analytics/visits` + `/performance`.
2. **No previous-period comparison for order-side metrics.** `/analytics` returns
   no `previous` block. Comparison is available only for the visit metrics
   (`comparison.*ChangePct`). The redesign shows deltas only where the backend
   sends them.
3. **No vendor custom date range.** `/analytics/visits` accepts `from`/`to`
   server-side but the vendor route forwards only `period`. Custom range is
   therefore offered as presets only (Today/7d/30d/90d) in the redesign; a true
   custom picker is a backend gap.
4. **No prep-time / acceptance-rate / category metrics** on `/analytics`
   (unchanged from BACKEND-GAPS §9).
5. **Customer menu-view beacon still not emitted anywhere** (BACKEND-GAPS §11),
   so views / unique visitors / funnel / most-viewed items are a **true zero**
   until the customer app ships the beacon. The redesign keeps the honest note.
6. **No CSV export endpoint.** Export is skipped and listed as a gap.
7. **No vendor settlement-statement / per-order refund-adjustment route.** Only
   the admin statement route exists. Phase 3 therefore shows the per-order base
   settlement (`foodSales`) from `/earnings/orders` and the payout status from
   `/settlements/summary`; refund/adjustment lines are not shown because the
   vendor route does not return them.
8. **Commission-rate semantics.** `earningsSnapshot` reports a `commissionRate`
   (e.g. 15/25%). The task's model is a customer-funded uplift with no stated
   commission. The redesign never prints a "% commission" claim; it shows the
   per-order net the backend returns. Flagged as an open question (Q29).

## 7. Risks

- **R1** Views are a true zero today → the whole traffic/funnel/items section is
  empty in production until the customer beacon ships. Mitigation: honest empty
  states and the existing note; sales/order/performance widgets stay real.
- **R2** The `/analytics/visits` response has grown (funnel + comparison + items).
  The existing `types/analytics.ts` only typed `summary/daily/byEventType`; it is
  extended defensively so an older backend still renders.
- **R3** Percentages must never be recomputed client-side. Mitigation: read
  `conversionRate`/`engagement`/`*ChangePct` from the server; only fall back to a
  pure helper where the backend is silent, and never fabricate a baseline.
- **R4** Vendor isolation: the app never sends a `restaurantId`; the backend
  derives it from the token. Mitigation: a test asserts no request carries a
  `restaurantId` query/body and that 403/404 render an error state.

## 8. Phased plan (one commit per phase)

- **Phase 1** — Redesign `InsightsPage`: header (range presets + last-updated +
  refresh), KPI row (7 metrics, inverted colour for cancellations, sparkline when
  available), traffic-trend chart, conversion funnel, most-viewed items table
  (sortable, inline bars), orders panel, info tooltips with the backend's exact
  formulas, and per-widget loading/empty/error states.
- **Phase 2** — Performance & ranking card (read-only) from `/performance`.
- **Phase 3** — Earnings/settlement visibility: per-order base settlement on the
  Finance segment from `/earnings/orders`.
- **Phase 4** — Verify the existing availability control already reflects the
  backend's status/reason and handles errors/concurrency (no new feature added).

## 9. Baseline (before the first commit)

`web/` on `rebuild/phase-2-orders` @ `8fae467`:
`npm run typecheck` clean, `npm run lint` clean, `npm test` → **46 files / 346
tests passed**, `npm run build` OK.
