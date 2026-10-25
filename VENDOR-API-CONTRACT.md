# VENDOR-API-CONTRACT.md

Verified contract between the Eatswada **Vendor App** (`/workspace/project/Vendor`)
and the Eatswada **backend** as actually implemented.

- Backend source audited: `kignas/Eatswada-` (cloned read-only into
  `/tmp/eatswada-audit/backend`, never modified).
- Router inspected: `routes/vendorRoutes.js`, mounted by `server.js` at
  `/api/vendor` **and** `/api/v1/vendor`.
- Controllers inspected: `controllers/vendorController.js`,
  `controllers/vendorMarketplaceController.js`,
  `controllers/restaurantController.js`, `controllers/analyticsController.js`,
  `controllers/notificationController.js`.
- Middleware inspected: `middleware/authMiddleware.js` (`protect`),
  `middleware/roleMiddleware.js` (`role('vendor')`).

Every endpoint the app calls below was confirmed to exist **and** to be scoped
to the caller's own restaurant. Anything not confirmed is listed in
`BACKEND-GAPS.md` and is gated off in the app.

All paths are relative to the API base (`CONFIG.API_BASE`, e.g.
`https://api.eatswada.com/api`). The app uses the legacy `/api/...` prefix; the
backend also serves the identical handlers under `/api/v1/...`.

## Auth

| Item | Value |
| --- | --- |
| Token storage | `localStorage['nearbite_vendor_token']` (via `CFG.TOKEN_KEY`) |
| Header | `Authorization: Bearer <token>` (`authHeaders()`) |
| Guard | `protect` + `role('vendor')` on every vendor route |
| 401 handling | `handleUnauthorized()` clears the token and returns to login |
| Ownership | Controllers filter by `req.user.restaurantId` (or an equivalent `orderOwnershipFilter`/`vendorRestaurantFilter`). The vendor never receives another restaurant's rows. |

## Orders

| Method | Path | Backend handler | Request | Response (used fields) |
| --- | --- | --- | --- | --- |
| GET | `/vendor/orders?view=queue` | `getVendorOrders` | — | `{ success, data: Order[], currentPage:1, totalPages:1, totalOrders }` (queue view is uncapped) |
| GET | `/vendor/orders?view=history&page=N&limit=M` | `getVendorOrders` | `page` ≥ 1, `limit` 1–100 (default 20) | `{ success, data, currentPage, totalPages, totalOrders }` |
| PUT | `/vendor/orders/:id/accept` | `acceptOrder` | `{ prepMinutes }` | `{ success, data }` |
| PUT | `/vendor/orders/:id/reject` | `rejectOrder` | `{ reason }` | `{ success, data }` |
| PUT | `/vendor/orders/:id/ready` | `markOrderReady` | — | `{ success, data, riderAssignment? }` |
| PUT | `/vendor/orders/:id/undo-ready` | `undoOrderReady` | — | 15-second window only; `{ success, data }` |
| PUT | `/vendor/orders/:id/extend-prep` | `extendOrderPreparation` | — | one-time +5 min; `409 PREP_EXTENSION_ALREADY_USED` if reused |
| PUT | `/vendor/orders/:id/status` | `updateOrderStatus` | body ignored; server derives next status | `{ success, data, riderAssignment? }` |
| POST | `/vendor/orders/:id/verify-delivery-otp` | `verifySelfDeliveryOtp` | `{ otp }` (4 digits) | `{ success, data }`; `409` unless `restaurant.deliveryMode === 'self_delivery'` |

Status flow (backend `VENDOR_STATUS_TRANSITIONS` / `allowedNextStatuses`):

```
placed → confirmed → preparing → waiting_for_rider (rider delivery)
                              ↘ out_for_delivery   (self-delivery)
out_for_delivery → (OTP verified) → delivered
```

The app **does not rename or remap** any status string. It renders the raw
value from the server.

Advance control: the app only offers `confirmed → preparing` and
`otp_verified → delivered` via `PUT /orders/:id/status`. The vendor route
derives the target itself; the app asserts the same mapping locally so it can
skip a pointless round-trip when the order has already moved.

Delivery-PIN gating: `verifySelfDeliveryOtp` refuses (409) unless the
restaurant's **current** `deliveryMode` is `self_delivery`. The app therefore
gates the "Verify delivery PIN" button on the current restaurant mode (falling
back to `order.deliveryModeSnapshot` only before the restaurant loads), so the
button is never shown for an order the server would reject.

## Menu & inventory

| Method | Path | Backend handler | Request | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/menu` | `getVendorMenu` | — | `{ success, data }` |
| POST | `/vendor/menu` | `createVendorMenuItem` | see below | item is created `approvalStatus:'pending'` |
| PUT | `/vendor/menu/:id/inventory` | `setVendorInventory` | `{ inStock?, manualAvailability?, stockQuantity?, trackStock?, lowStockThreshold? }` | `stockQuantity` must be a non-negative integer |
| PUT | `/vendor/menu/:id/toggle-stock` | `toggleItemStock` | `{ inStock?, autoTurnOnAt? }` | `autoTurnOnAt` = future ISO time within 30 days, or `null` for manual |
| PUT | `/vendor/menu/availability/bulk` | `bulkSetVendorAvailability` | `{ itemIds: string[1..200], inStock: boolean }` | |
| PUT | `/vendor/menu/reorder` | `reorderVendorMenu` | `{ items: [{ id, sortOrder }] }` | |
| GET | `/vendor/inventory/history?itemId=&limit=` | `getVendorStockHistory` | — | `limit` 1–100 (default 50) |
| POST | `/vendor/menu/upload-image` | `uploadVendorMenuImage` | multipart `image` | ≤ 5 MB |

`POST /vendor/menu` fields the controller reads (nothing else is accepted as a
definition): `name`, `price`, `description`, `originalPrice`, `image`, `isVeg`,
`category`, `inStock`, `trackStock`, `stockQuantity`, `lowStockThreshold`,
`customizations`, `sortOrder`. The app sends only these.

Auto-restock is expressed through `PUT /vendor/menu/:id/toggle-stock` with
`autoTurnOnAt`. A background job (`services/menuStockScheduler.js`) flips
`inStock` back on when the timestamp passes. There is **no** bulk
schedule/cancel restock route; the app does not offer one.

## Restaurant, hours & availability

| Method | Path | Backend handler | Request | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/restaurant` | `getRestaurantProfile` | — | header profile + `isActive` |
| GET | `/vendor/profile` | `getVendorProfile` | — | full profile incl. `policies`; **read-only** |
| PUT | `/vendor/restaurant/profile` | `restaurantController.updateRestaurant` | vendor allow-list only | see below |
| PUT | `/vendor/restaurant/availability` | `updateVendorAvailability` | availability payload | |
| PUT | `/vendor/restaurant/hours` | `updateBusinessHours` | `openingHours` | validated per-day |

`PUT /vendor/restaurant/profile` vendor allow-list (backend `VENDOR_EDITABLE`):
`name`, `address`, `phone`, `contactNumber`, `image`, `images`, `cuisine`,
`cuisineDisplay`, `description`, `estimatedDeliveryMin`, `availability`,
`isOpen`. Admin-only fields (e.g. `codEnabled`, `isBestSeller`, `isNearFast`)
are dropped server-side and the app never sends them.

Note: `GET /vendor/profile` is read-only because the backend mounts **no**
`PUT /vendor/profile`. The app's profile editor writes through
`PUT /vendor/restaurant/profile` and reads through `GET /vendor/restaurant`.

## Finance, settlements & analytics

| Method | Path | Backend handler | Response (used fields) |
| --- | --- | --- | --- |
| GET | `/vendor/earnings/summary?period=today\|7d\|30d\|all` | `getVendorEarningsSummary` | `{ period, currency, current, lifetime, settlement }` |
| GET | `/vendor/earnings/orders?page=&limit=&view=completed\|in_progress\|all` | `getVendorEarningsOrders` | `{ data: [{ id, orderNumber, status, foodSales, commissionRate, commission, restaurantNetAmount, commissionSource }], pagination }` |
| GET | `/vendor/settlements/summary` | `getVendorSettlementSummary` | `{ currency, settlementSchedule, joinDate, eligibleBalance, availableForWithdrawal, activePayoutRequest }` |
| GET | `/vendor/settlements/withdrawals` | `listVendorWithdrawals` | `[PayoutRequest]` (own rows only) |
| POST | `/vendor/settlements/withdraw` | `requestVendorWithdrawal` | `{ amount? }`; blank = full eligible balance |
| GET | `/vendor/analytics?period=7d\|30d\|90d\|all` | `getVendorAnalytics` | `{ period, summary:{ totalOrders, deliveredOrders, cancelledOrders, deliveredFoodSales, averageDeliveredOrderValue }, statusCounts, daily, topItems, currency }` |
| GET | `/vendor/analytics/visits?period=` | `analyticsController.getVendorMenuAnalytics` | menu-view summary |

The app reads the finance figures from the real field names
(`eligibleBalance`, `availableForWithdrawal`, `activePayoutRequest`) and the
"last payout" cell from the vendor's own `PayoutRequest` rows (which carry
`bankUtr`/`reference`). It never reads an admin settlement route.

Analytics reads `data.summary` with the exact keys above.

## Operational settings & capacity

| Method | Path | Backend handler | Request |
| --- | --- | --- | --- |
| GET | `/vendor/settings` | `getVendorOperationalSettings` | — |
| PUT | `/vendor/settings` | `updateVendorOperationalSettings` | `{ maxActiveOrders? (1–500 int), settlementSchedule? ('weekly'\|'monthly') }` |
| GET | `/vendor/capacity` | `getVendorCapacity` | — |

The app sends only `maxActiveOrders` and `settlementSchedule` on save;
`deliveryMode` and `commissionRate` are read-only there (backend rejects
changes to them).

## Reviews & support

| Method | Path | Backend handler | Request |
| --- | --- | --- | --- |
| GET | `/vendor/reviews?page=&limit=` | `getVendorReviews` | — |
| POST | `/vendor/reviews/:id/reply` | `replyToVendorReview` | `{ message }` |
| GET | `/vendor/support` | `listVendorSupportTickets` | — |
| POST | `/vendor/support` | `createVendorSupportTicket` | `{ subject, message, category?, priority?, orderId? }` |
| POST | `/vendor/support/:id/reply` | `replyVendorSupportTicket` | `{ message }` |

## Platform status (read-only, public)

| Method | Path | Backend handler | Notes |
| --- | --- | --- | --- |
| GET | `/platform/public-status` | `platformController.getPublicStatus` | The **only** non-admin platform snapshot (`optionalAuth`) |

`GET /platform/settings` is admin-only (`authorize('admin')` +
`requirePermission('settings.manage')`) and is **never** called by the vendor
app.

## Notifications

| Method | Path | Backend handler | Notes |
| --- | --- | --- | --- |
| GET | `/notifications` | `notificationController.list` | own notifications only, newest first, ≤ 100 |
| PATCH | `/notifications/:id/read` | `markRead` | stamps `readAt`; scoped to `user: req.user._id` |
| POST | `/notifications/register-token` | push token registration | |
| POST | `/notifications/unregister-token` | push token removal | |

Read state is the server's `readAt`; the app's local set is only an optimistic
cache for rows just marked on this device.

## Capability flags

`index.html` defines a frozen `caps` object. A `false` flag means the backend
route does not exist, so no request is sent and no figure is invented.

| Flag | Value | Reason |
| --- | --- | --- |
| `prepCountdown` | true | `order.prepReadyAt` returned by `GET /orders` |
| `billBreakdown` | true | `order.commission` + `order.bill` snapshots |
| `autoRestock` | true | `PUT /menu/:id/toggle-stock` accepts `autoTurnOnAt` |
| `selfDeliveryOtp` | true | `POST /orders/:id/verify-delivery-otp` |
| `inventoryQty` | true | `PUT /menu/:id/inventory` |
| `profileEdit` | true | `PUT /restaurant/profile` |
| `settlements` | true | `/settlements/summary|withdrawals|withdraw` |
| `complaints` | **false** | backend mounts no vendor complaint route |
| `menuEdit` | false | controller exists, `PUT /menu/:id` is **not mounted** |
| `menuDelete` | false | controller exists, `DELETE /menu/:id` is **not mounted** |

The flags are `Object.freeze`d and there is **no** URL query-parameter or
runtime override, so a crafted link (`?cap=...`) cannot enable an unverified
request. `tests/contract.test.mjs` pins the set and the immutability.
