# BACKEND-GAPS.md

Features the Vendor App cannot fully implement because the backend does not
expose a route for them. For each gap the app is honest: it either hides the
feature or states the gap in the UI. It never invents an endpoint, a field, a
status, or a "saved" success message.

Backend audited: `kignas/Eatswada-` (`routes/vendorRoutes.js` and its
controllers). Every gap below was confirmed by reading the route table and the
controllers — the controller function often exists but the route is not
mounted, which is why a naive implementation would 404.

## 1. Menu item edit — `PUT /vendor/menu/:id` not mounted

- Controller `vendorMarketplaceController.updateVendorMenuItem` exists and
  handles definition changes (name, price, description, category, image,
  `customizations`, `sortOrder`) plus inventory fields.
- `routes/vendorRoutes.js` mounts only:
  `PUT /menu/:id/inventory` and `PUT /menu/:id/toggle-stock`. There is **no**
  `router.put('/menu/:id', …)`.
- **App behaviour:** `caps.menuEdit = false`. The menu card shows no Edit
  button; the create sheet is create-only. Inventory and stock are still fully
  editable through their real routes.

**Backend change to close it:** mount
`router.put('/menu/:id', protect, role('vendor'), marketplace.updateVendorMenuItem)`.

## 2. Menu item delete — `DELETE /vendor/menu/:id` not mounted

- Controller `deleteVendorMenuItem` exists (soft delete: `isActive:false`).
- No `router.delete('/menu/:id', …)` in `routes/vendorRoutes.js`.
- **App behaviour:** `caps.menuDelete = false`; no Delete button is rendered.

**Backend change to close it:** mount
`router.delete('/menu/:id', protect, role('vendor'), marketplace.deleteVendorMenuItem)`.

## 3. Vendor complaints — no vendor route at all

- There is no `GET /vendor/complaints`, `GET /vendor/complaints/:id`, or
  `POST /vendor/complaints/:id/dispute` in the backend. Complaints/refunds are
  resolved from the admin console only.
- The customer-support router (`/api/support`) serves **customers**, not
  vendors.
- **App behaviour:** `caps.complaints = false`. The Reviews → Complaints tab
  renders a panel stating the gap instead of a list, `complaintCount()` returns
  `null` (no invented badge), and `submitDispute()` refuses and points the
  vendor at the real Support ticket flow.

**Backend change to close it:** add a vendor-scoped complaints route that
returns the restaurant's own complaint/refund records and accepts a vendor
dispute/reply.

## 4. Bulk restock scheduling — no route

- Auto-restock is per item: `PUT /vendor/menu/:id/toggle-stock` with
  `autoTurnOnAt`. `services/menuStockScheduler.js` performs the flip.
- There is **no** `PUT /vendor/menu/restock` (bulk schedule) and **no** bulk
  cancel route.
- **App behaviour:** the inventory sheet explains that restock times are saved
  per item (`autoTurnOnAt`) and applied automatically; the bulk schedule/delay
  controls are disabled and send no request. Restock is still offered per item.

**Backend change to close it:** add a bulk restock-schedule route accepting
`{ itemIds, autoTurnOnAt }` if bulk scheduling is desired.

## 5. Vendor self-service profile update — `PUT /vendor/profile` not mounted

- `GET /vendor/profile` exists (`getVendorProfile`) and is read-only.
- There is no `PUT /vendor/profile`. The vendor's own write path is
  `PUT /vendor/restaurant/profile` → `restaurantController.updateRestaurant`,
  which applies a vendor allow-list and drops admin-only fields.
- **App behaviour:** the profile editor writes through
  `PUT /vendor/restaurant/profile` (the real route). `GET /vendor/profile` is
  used for the read-only policy/approval display.

**Backend change to close it:** none required; the restaurant profile route is
the intended vendor write path. Documented here because the naming is
asymmetric and easy to get wrong.

## 6. Admin settlement/batch visibility — admin-only

- `GET /vendor/settlements/summary`, `/vendor/settlements/withdrawals`, and
  `POST /vendor/settlements/withdraw` are vendor-scoped and exist.
- Payout **batches** and settlement runs are admin-side; there is no
  vendor-facing batch endpoint.
- **App behaviour:** the app lists the vendor's own `PayoutRequest` rows as the
  payout history and never calls an admin settlement route.

**Backend change to close it:** add a vendor settlement-batch endpoint if
batches should be visible to vendors.

## 7. Platform settings — admin-only (by design)

- `GET/PUT /platform/settings` require `admin` + `settings.manage`.
- The only non-admin snapshot is `GET /platform/public-status` (`optionalAuth`).
- **App behaviour:** the app calls `/platform/public-status` only. It never
  calls `/platform/settings`.

**Backend change to close it:** none — this is correct. If vendors should see
additional platform state, extend the public-status whitelist.

## 8. Delivery-PIN verification for rider orders — not vendor-triggerable

- `POST /vendor/orders/:id/verify-delivery-otp` returns `409` unless the
  restaurant's **current** `deliveryMode` is `self_delivery`.
- Rider-delivered orders are closed by the rider app, not the vendor.
- **App behaviour:** the PIN button is shown only when the restaurant's current
  mode is self-delivery (falling back to the order snapshot before the
  restaurant loads), so it never appears where the server would refuse.

**Backend change to close it:** none required.

## 9. Growth analytics — metrics the endpoint does not return

`GET /vendor/analytics?period=` returns `data.summary` (`totalOrders`,
`deliveredOrders`, `cancelledOrders`, `deliveredFoodSales`,
`averageDeliveredOrderValue`), `data.daily`, `data.statusCounts` and
`data.topItems`; `GET /vendor/analytics/visits` adds `totalViews` /
`uniqueVisitors`. The Growth screen renders exactly these.

Metrics the task asks for that are **not** derivable from those fields:

| Metric | Why it is unavailable | Instrumentation needed |
| --- | --- | --- |
| Previous-period comparison | the endpoint takes no previous-window parameter and returns no prior totals | accept `?compare=previous` (or `period`+`baseline`) and return a `previous` summary block |
| Average preparation time | no prep-duration field on the summary or daily rows | return `averagePrepMinutes` (from `acceptedAt`→`readyAt`) |
| Acceptance rate | `summary` has no `acceptedOrders` count | return `acceptedOrders` (or `rejectedOrders`) |
| Category performance | `topItems` has no category dimension | add `data.byCategory [{ category, orders, sales }]` |

**App behaviour:** the Growth screen shows the within-period trend ("2nd half
vs 1st half" of the returned `daily` series) and labels it as such — it never
presents it as a previous-period delta, and it omits any metric the backend did
not send instead of zero-filling (AGENTS.md rule 5).

## 10. Restaurant availability reason — no dedicated field

`PUT /vendor/restaurant/availability` accepts `{ status }`
(`open|busy|closed_today|temporarily_closed`) and the restaurant object exposes
`availability` / `isOpen`. There is no `availabilityReason`, `closedReason` or
`pauseUntil` field.

**App behaviour:** `statusReasonOf()` reads a reason only when the backend
supplies one (defensive: `availability.reason|message|note|closedReason|
pauseReason`, or a top-level `availabilityReason`/`closureReason`) and returns
`null` otherwise, so no reason text is invented. The status control and the
outlet sheet therefore show a reason the moment the backend provides it, with no
client change.

**Backend change to close it:** include `reason` (and optionally `resumeAt`) in
the restaurant `availability` object, set when the vendor picks a non-open
status.

## 11. Customer menu-view tracking — no beacon is emitted anywhere

`GET /vendor/analytics/visits` reads `AnalyticsEvent` rows with
`scope: 'restaurant'` and `eventType` `menu_view` / `restaurant_view`
(`services/analyticsService.js` → `getRestaurantVisitAnalytics`). Those rows are
written **only** by the public beacon `POST /api/analytics/visit`
(`controllers/analyticsController.js` → `trackVisit`, mounted in
`routes/analyticsRoutes.js`).

**No client emits that beacon.** Verified across every accessible repository:
this vendor app, the `Eatswada-` backend (defines the route only), the customer
web app `eatswada-nextjs`, `Eatswada-2.0`, `Nearbit`, `Nearbite-`, `Nearbite1`,
`Sagnik-`, and `Admin` (which *reads* the admin analytics but never writes).
Consequently the collection is empty and the vendor's menu views / unique
visitors are a **true zero**.

- **App behaviour:** the Growth screen shows the real zero and an explicit note
  that customer views are not being recorded yet; it never fabricates a view
  count. Sales and order KPIs on the same screen are real (the analytics
  envelope was also being mis-read — see
  `docs/rebuild/ANALYTICS_ROOT_CAUSE.md`).
- **This is not fixable in the vendor app:** the vendor is the reader of this
  metric, not the writer.

**Backend/customer change to close it:** add a fire-and-forget beacon on the
customer restaurant/menu page:

```js
navigator.sendBeacon(
  `${API_ORIGIN}/api/analytics/visit`,
  new Blob([JSON.stringify({ eventType: 'menu_view', restaurantId })], {
    type: 'application/json',
  }),
);
```

(fire on `menu_view` when the menu opens and `restaurant_view` for the
restaurant page). The endpoint already deduplicates per actor per day via the
unique `dedupeKey = eventType:restaurant:actor:day` index, so refreshes cannot
inflate the count and "unique visitors per day" is exact without client state.

---

## Summary table

| # | Feature | Backend status | App status |
| --- | --- | --- | --- |
| 1 | Menu item edit | route not mounted | hidden (`caps.menuEdit=false`) |
| 2 | Menu item delete | route not mounted | hidden (`caps.menuDelete=false`) |
| 3 | Vendor complaints | no route | gated with an explicit gap message |
| 4 | Bulk restock scheduling | no route | controls disabled; per-item restock works |
| 5 | `PUT /vendor/profile` | not mounted | uses `PUT /vendor/restaurant/profile` |
| 6 | Settlement batches | admin-only | shows own `PayoutRequest` rows |
| 7 | Platform settings | admin-only | uses `/platform/public-status` |
| 8 | Rider-order OTP | self-delivery only | button gated on current mode |
| 9 | Growth comparison/prep/acceptance/category metrics | not returned by `/analytics` | within-period trend only; missing metrics omitted |
| 10 | Availability reason | no field | shown only when the backend sends one |
| 11 | Customer menu-view tracking | beacon `POST /analytics/visit` exists but no client emits it | real zero shown + honest note; customer app must emit the beacon |

None of these is worked around with fake data or a frontend-only "success".
