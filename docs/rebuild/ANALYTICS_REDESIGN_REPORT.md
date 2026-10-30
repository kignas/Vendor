# Analytics Redesign — Final Report

Branch: `rebuild/phase-2-orders` · app root `/workspace/project/Vendor`, web app in `web/`.

## 1. Audit report (defects found in the existing analytics page)

Full audit: `docs/rebuild/ANALYTICS_REDESIGN_AUDIT.md`. The headline defects:

| # | Defect | Fix |
| --- | --- | --- |
| D1 | The page depended on `GET /vendor/analytics/overview`, which **does not exist** on the backend, so it always hit its 404 fallback. | Dropped the invented endpoint; the page now reads only `/analytics` + `/analytics/visits`. |
| D2 | Missing metrics were zero-filled (`num(null) === 0`), producing fake `0` KPIs. | `optNum` treats a missing value as **absent**; the card shows "Not enough data yet". |
| D3 | Conversion / rates recomputed client-side. | Every rate/percent is read from the server (`conversionRate`, `engagement`, `*ChangePct`). |
| D4 | No period comparison rendered. | Deltas render only where the backend sends them (visit metrics). |
| D5 | No funnel, no most-viewed items, no traffic trend. | Added, using backend counts only. |
| D6 | One failing widget blanked the page. | Each widget owns its loading/empty/error state. |
| D7 | Placeholder em dash where a real "not enough data" label was needed. | Explicit `Not enough data yet`. |
| D8 | No "last updated" / refresh discipline. | Added, with a refresh button disabled while fetching. |
| D9 | Charts were single-series. | New multi-series `TrendChart` (legend, tooltip, sr-only table). |
| D10 | No read-only performance/ranking visibility. | `PerformanceCard` (Phase 2). |
| D11 | Settlement list showed only net; no base settlement. | Per-order base settlement + payable (Phase 3). |
| D12 | Money formatting: large counts ungrouped. | `formatCompactNumber` + `formatCount` (Indian grouping). |
| D13 | No `aria`/table alternative for charts. | sr-only table + labelled hit targets. |
| D14 | Cancellations coloured like a normal "up is good" metric. | `invertDelta` (down is good). |

## 2. Before / after

**Before.** A flat list: four KPIs (orders, sales, AOV, cancellation), a single-line
sales chart, a peak-hours bar list and a top-items list. It read from an invented
overview endpoint, zero-filled missing metrics, recomputed rates and blanked on a
single failure. No funnel, no comparison, no performance, no settlement.

**After.** A single analytics page (route and nav entry unchanged — Insights is the
`?seg=insights` segment of the Business hub at `/business`, with `/insights`
redirecting there) with:
a header (period presets + last-updated + refresh), a 7-tile KPI row with
sparklines and inverted-cancellation deltas, a two-series traffic trend, a
conversion funnel, a sortable most-viewed-items table, an orders panel, a
read-only performance & ranking card and a per-order settlement list — each with
its own loading / empty / error state.

Screenshots captured in staging (headless chromium against the mock API): the
Insights segment renders the KPI row, trend, funnel, items table, orders panel and
performance card; the Finance segment renders the per-order settlement rows with
`Base settlement ₹260.00 / Payable ₹221.00`.

## 3. Files created / modified

**Created**
- `web/src/types/analytics.ts` (rewritten) and `web/src/types/performance.ts`
- `web/src/services/api/analytics.ts` (rewritten), `web/src/services/api/performance.ts`
- `web/src/hooks/useAnalytics.ts`, `web/src/hooks/usePerformance.ts`
- `web/src/components/InfoTip.tsx`, `web/src/components/charts/TrendChart.tsx`
- `web/src/features/insights/AnalyticsHeader.tsx`
- `web/src/features/insights/ConversionFunnel.tsx`
- `web/src/features/insights/MostViewedItems.tsx`
- `web/src/features/insights/OrdersPanel.tsx`
- `web/src/features/insights/PerformanceCard.tsx`
- Tests: `web/src/features/insights/analyticsDomain.test.ts` (rewritten),
  `InsightsPage.test.tsx` (rewritten), `PerformanceCard.test.tsx`,
  `web/src/features/finance/financeSettlement.test.ts`, `web/src/lib/format.test.ts`
- Docs: `docs/rebuild/ANALYTICS_REDESIGN_AUDIT.md`, this report

**Modified**
- `web/src/features/insights/InsightsPage.tsx`, `analyticsDomain.ts` (rewritten)
- `web/src/features/finance/FinancePage.tsx`, `financeDomain.ts`
- `web/src/components/KpiCard.tsx` (invertDelta, emptyLabel, valueTitle, spark)
- `web/src/lib/format.ts` (compact + count helpers)
- `web/src/features/restaurant/RestaurantStatusControl.test.tsx` (concurrency test)
- `web/scripts/mock-api.mjs` (real endpoints), `docs/rebuild/OPEN_QUESTIONS.md` (Q27–Q30)

## 4. API contract table actually used

| Method + path | Query | Auth | Response (fields used) |
| --- | --- | --- | --- |
| `GET /vendor/analytics` | `period=today\|7d\|30d\|90d\|all` | vendor bearer | `{ data: { period, currency, summary{totalOrders,deliveredOrders,cancelledOrders,deliveredFoodSales,averageDeliveredOrderValue}, daily[], topItems[] } }` |
| `GET /vendor/analytics/visits` | `period=…` | vendor bearer | `{ data: { summary{totalViews,uniqueVisitors,itemViews,addToCart,removeFromCart,checkoutInitiated,completedOrders,cancelledOrders,refunds,conversionRate,revenue,attribution{windowHours}}, comparison{viewsChangePct,uniqueVisitorsChangePct,completedOrdersChangePct,conversionRateChangePct}, daily[], mostViewedItems[]{name,views,addToCart,engagement} } }` |
| `GET /vendor/performance` | — | vendor bearer | `{ data: { score, isNewRestaurant, computedAt, factors[]{key,label,weight,normalised,hasData}, sample{avgRating,reviews,…}, availability{class,orderable,reason,label}, ranking{featured,pinned,sponsored,sponsorLabel} } }` |
| `GET /vendor/earnings/summary` | `period=…` | vendor bearer | `{ data: { current{deliveredFoodSales,deliveredCommission,deliveredEarnings,inProgress}, lifetime, settlement } }` |
| `GET /vendor/earnings/orders` | `view=completed&page=&limit=` | vendor bearer | `{ data: [{ orderNumber,status,createdAt,foodSales,commission,restaurantNetAmount }] }` |
| `GET /vendor/settlements/summary` | — | vendor bearer | `{ data: { eligibleBalance, availableForWithdrawal, settlementSchedule, activePayoutRequest } }` |
| `GET /vendor/settlements/withdrawals` | — | vendor bearer | `{ data: [{ amount,status,createdAt,utr }] }` |
| `PUT /vendor/restaurant/availability` | body `{ status }` | vendor bearer | `{ success }` (Phase 4, pre-existing) |

No request carries a `restaurantId`; the backend derives the restaurant from the token.

## 5. Test / lint / build results (actual)

- Baseline (before this work, `web/` @ `8fae467`): typecheck clean, lint clean,
  **46 test files / 346 tests passed**, build OK.
- Final: `npm run typecheck` clean · `npm run lint` clean (0 errors, 0 warnings) ·
  `npm test` → **49 test files / 361 tests passed** · `npm run build` OK.
- Delta: +3 test files, +15 tests, no failures.

## 6. Backend gaps / contract mismatches (not changed here)

1. `GET /vendor/analytics/overview` does not exist (Q27).
2. No previous-period block on the order-side `/analytics`.
3. No vendor custom date range — `/analytics/visits` forwards only `period` (Q28).
4. No CSV export endpoint.
5. No vendor settlement-statement / refund-adjustment route (admin-only) (Q30).
6. Commission-rate semantics: the task's model is a customer-funded uplift, but
   `earningsSnapshot` reports a `commissionRate` (Q29). The UI never prints a
   "commission %" claim.
7. Customer menu-view beacon not emitted yet → views/funnel/items are a true zero
   in production (BACKEND-GAPS §11). Honest note shown.

## 7. Manual staging verification steps

Setup: build with the staging API origin, seed localStorage, serve `dist` on :12001.

1. **Phase 1** — open `/#/business`. Confirm the KPI row, switch presets and
   confirm the network calls use `?period=`. Confirm a missing metric shows
   "Not enough data yet" (not `0`). Confirm one widget error (block
   `/analytics/visits`) still renders the order widgets.
2. **Phase 2** — confirm the Performance card shows the score, availability and
   factor list; open "Ranking factors"; confirm no editable control exists.
3. **Phase 3** — open `/#/business?seg=finance`; confirm per-order base settlement
   and payable render from `/earnings/orders`.
4. **Phase 4** — on the Overview screen, change availability; confirm a single PUT
   and a rollback on a server rejection.
