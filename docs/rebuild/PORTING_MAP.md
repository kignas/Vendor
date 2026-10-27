# Vendor App — Porting Map (Phase 0 recon)

Read-only reconnaissance of the legacy plain-HTML/JS app, written before any
React/TypeScript work starts. **No existing file was changed to produce this
document.**

Sources read in full for this map: `VENDOR-API-CONTRACT.md`, `BACKEND-GAPS.md`,
`CHANGES.md`, `TEST-REPORT.md`, `config.js`, `sw.js`, `firebase-messaging-sw.js`,
`native-push.js`, `native-push-vendor.js`, `scripts/prepare-www.mjs`,
`.github/workflows/build-android.yml`, `tests/contract.test.mjs`,
`tests/upgrade-features.test.mjs`, `tests/dom.smoke.test.mjs`, `login.html`,
`apply.html`, `application-status.html`, and `index.html` read in ranges
(never printed whole).

Key facts to keep in mind while reading the table:

- The legacy dashboard is a **single 5,058-line `index.html`** whose logic lives
  in one `IIFE` (line 1275 onward, `'use strict'`). There is no module system.
- `web/` **does not exist yet**. The target column below is the folder layout
  mandated by `AGENTS.md`, not something already on disk.
- All vendor calls go through `apiFetch(path)` → `fetchJson(API_BASE + path)`.
  `API_BASE = CONFIG.API_BASE = <origin>/api/vendor`. `menuFetch` is an alias
  with the same base. `checkVendorNotifications`/`loadNotifications`/
  `loadPlatformSettings` bypass the `/vendor` prefix and use
  `CFG.NOTIFICATIONS_BASE` / `CFG.PLATFORM_BASE`.
- `handleUnauthorized()` is called on **any** HTTP 401 (see §5).

---

## 1. Function / feature → target module → endpoint → state → tests

### 1a. Auth & app shell

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `init()` (5039) | `app/providers` + `features/home` boot | `GET /restaurant`, `GET /orders?view=queue` (via `Promise.all`) | `state.rushMode` | `dom.smoke`: "dashboard boots…" |
| `authHeaders()` (1394), `fetchJson()` (1380), `apiFetch()` (1401), `menuFetch()` (3211) | `lib/api` (client + auth header + 401 hook) | — (transport) | — | `contract`: "auth, API client and polling integration points are preserved" |
| `handleUnauthorized()` (1396) | `lib/auth` | — | clears token + user + restaurant | `contract`: integration-point pin |
| `logout()` (3478) | `features/settings` | — | clears 3 localStorage keys | `contract` (token key); no dedicated test |
| `switchSection()` (3188) | `app/layout` (bottom nav + section router) | — | `state.activeSection` | `dom.smoke`: section-tab clicks used throughout |
| `setConnectionState()` (1406), `updateNetworkUi()` (3479) | `app/layout` (offline banner) | — | `state` connection kind | not covered directly |
| `showToast()` (1548), `renderRetry()` (1542) | `components/` (toast, ErrorState) | — | — | indirect only |

### 1b. Home / overview

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadRestaurant()` (2276) | `features/home` (query) | `GET /restaurant` | `state.restaurant` | `dom.smoke`: outlet header |
| `loadOverview()` (3074) | `features/home` | `GET /earnings/summary?period=today`, `?period=30d`, `GET /dashboard` | `state.dashboard` | `dom.smoke` boots home |
| `renderOverviewStatus()` (3052), `renderOverviewDocs()` (3063), `overviewCard()` (3012) | `features/home` | — | — | indirect |
| `pendingOrderCount()` (3015), `refreshOverviewCounts()` (3023), `activeStatuses()` (3036), `loadCapacity()` (3041) | `features/home` | `GET /capacity` | `state.activeStatuses`, `state.serverAlerts` | `dom.smoke` (counts render) |
| `renderAlerts()` (4339), `loadAlerts()` (4380) | `features/home` | `GET /alerts` | `state.serverAlerts` | `dom.smoke` (dashboard boot) |
| `renderActivity()` (4389), `loadActivity()` (4420) | `features/home` | `GET /activity` | `state.serverActivity` | indirect |
| `renderOnlinePill()` (4501), `renderOutletMenuChip()` (1470), `renderOutletHeader()` (1450), `outletServiceArea()` (1434) | `app/layout` (header) | — | — | `dom.smoke`: outlet header assertions |
| `renderPlatformBanner()` (4454), `platformFlagsOf()` (4443), `loadPlatformSettings()` (4467) | `features/home` | `GET /platform/public-status` | `state.platform` | `upgrade-features`: `platformFlagsOf`; `dom.smoke`: platform banner |
| `renderRushMode()` (4485), `setRushMode()` (4493), `rushModeOn()` (4483), `defaultPrepMinutes()` (4484) | `features/settings` | — | `state.rushMode` (+ `RUSH_KEY`) | not covered |

### 1c. Orders

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadQueue()` (2362) | `features/orders` (query) | `GET /orders?view=queue` | `state.queue`, `state.consecutivePollErrors`, `state.queueRequest` | `dom.smoke`: boot, legacy order |
| `loadHistory()` (2383), `loadMoreHistory()` (2403) | `features/orders` (query) | `GET /orders?view=history&page=&limit=20` | `state.history`, `historyPage`, `historyTotalPages`, `historyTotal`, `historyRequest` | not covered directly |
| `ordersForTab()` (2113), `visibleOrdersForTab()` (2136), `renderActiveTab()` (2143), `updateCounts()` (2171), `renderEmpty()` (2078) | `features/orders` (tabs + list) | — | `state.activeTab`, `state.orderSearch` | `dom.smoke`: tabs, search, "No matches" |
| `isReadyOrder()` (2102), `isPreparingOrder()` (2107), `isScheduledOrder()` (2094), `scheduledAtOf()` (2086) | `features/orders` (mapping) | — | — | indirect (`dom.smoke` tab counts) |
| `orderMatchesQuery()` (2126) | `lib/format` (search) | — | — | `contract`: "order search matches documented fields…" |
| `renderTicket()` (1976) + `prepStripHtml` (1731), `riderStatusHtml` (1777), `riderStatusOf` (1755), `riderNameOf` (1758), `riderPhoneOf` (1762), `dietPillHtml` (1909), `orderCountChipHtml` (1919), `itemRowHtml` (1925), `ticketToolsHtml` (1934), `ticketStamp` (1903), `loyaltySubtitle` (1895), `pickupCodeOf` (1869), `orderRef` (1865), `ordinal` (1889), `dietMarkHtml` (1597), `itemMetaHtml` (1611) | `features/orders` + `components/` (OrderCard, StatusPill, DietMark) | — | — | `dom.smoke`: kitchen workflow, diet marks, legacy order |
| `dietOf()` (1587) | `lib/format` | — | — | `contract`: "dietOf never infers…" |
| `orderBillOf()` (1628), `billRows()` (1640), `billDetailsHtml()` (1689), `paymentModeOf()` (1664), `commissionPctOf()` (1679) | `features/orders` (bill breakdown) | — | — | `contract`: 3 bill tests; `dom.smoke`: bill details |
| `acceptOrder()` (2408), `openPrepSheet()` (2417), `closePrepSheet()` (2428) | `features/orders` (accept sheet) | `PUT /orders/:id/accept` | `state.actionBusy`, `state.pendingAcceptId`, `state.prepMinutes` | `dom.smoke` (implicitly via tabs); contract pins body |
| `openRejectModal()` (2429), `closeRejectModal()` (2430), `confirmReject()` (2432) | `features/orders` (reject sheet) | `PUT /orders/:id/reject` | `state.pendingRejectOrderId` | contract pins body |
| `advanceOrder()` (2448) + `ADVANCE_TARGET` (2447) | `features/orders` | `PUT /orders/:id/status` `{status:next}` | `state.actionBusy` | contract pins body; `dom.smoke` (advance not directly) |
| `markOrderReady()` (2466), `showUndoReadyToast()` (2478) | `features/orders` | `PUT /orders/:id/ready`, `PUT /orders/:id/undo-ready` | `state.actionBusy`, `state.undoReadyTimer` | contract: duplicate-guard test |
| `extendPrep()` (2507) | `features/orders` | `PUT /orders/:id/extend-prep` | `state.extendedPrep` | contract: duplicate-guard test |
| `openOtpSheet()` (2524), `verifyDeliveryOtp()` (2532) | `features/orders` | `POST /orders/:id/verify-delivery-otp` | `v2.otpBusy`, `state.pendingOtpOrderId` | `dom.smoke`: 2 OTP tests; `upgrade-features`: `isSelfDeliveryOrder` |
| `isSelfDeliveryOrder()` (1881) | `features/orders` (gate) | — | — | `upgrade-features`: 2 tests |
| `copyPickupCode()` (2557) | `features/orders` | — | — | not covered |
| `prepDeadlineOf()` (1857), `kptPct()` (1943), `startKptTimer()` (1951), `startPrepTimer()` (2296), `startOrderResponseTimer()` (2334), `startRiderTimer()` (1834), `clearOrderResponseTimer()` (2285), `msUntil()` (1766), `mmss()` (1772) | `features/orders` (timers) | — | `state.prepTimer`, `kptTimer`, `riderTimer`, `orderResponseTimer` | `dom.smoke`: prep strip deadline |
| `buildKotHtml()` (2577), `printKot()` (2600), `orderById()` (2573) | `features/orders` (KOT) | — | — | `contract`: KOT escaping, print root |
| `buildOrderSpeech()` (2627), `speakOrder()` (2634), `speechAvailable()` (2620), `installedSpeakLangs()` (2621) | `features/orders` (voice) | — | — | `contract`: speech text |
| `openOrderSupport()` (2663), `orderSupportBack()` (2679), `chooseOrderSupportKind()` (2690), `submitOrderSupport()` (2708) + `SUPPORT_KIND` | `features/support` | `POST /support` | `state.pendingSupportOrder`, `pendingSupportKind` | not covered |

### 1d. Menu

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadMenu()` (3366) | `features/menu` (query) | `GET /menu` | `state.menuItems`, `menuLoaded`, `menuRequest` | `dom.smoke`: menu section |
| `renderMenuCard()` (3229), `renderMenuList()` (3292), `menuApprovalOf()` (3217), `menuApprovalBadge()` (3223), `populateMenuCategories()` (3286) | `features/menu` | — | — | `upgrade-features`: 2 `renderMenuCard` tests |
| `toggleMenuItemStock()` (3378) | `features/menu` | `PUT /menu/:id/toggle-stock` | `state.menuItems` (mutated) | `dom.smoke`: restock panel |
| `openRestockSheet()` (3441), `closeRestockSheet()` (3448), `chooseRestockOption()` (3452), `restockTimestampFor()` (3433), `nextOpeningAt()` (3415), `RESTOCK_LABEL` | `features/menu` (restock) | `PUT /menu/:id/toggle-stock` `{autoTurnOnAt}` | `state.pendingRestockItemId` | `upgrade-features`: `nextOpeningAt`, `restockTimestampFor`; contract: toggle-stock shape |
| `saveMenuOrder()` (3325), `moveMenuItem()` (3337), `toggleMenuReorder()` (3345) | `features/menu` (reorder) | `PUT /menu/reorder` | `state.menuReorderMode`, `state.menuOrder` | not covered |
| `openMenuEditor()` (3706), `setVegChip()` (3743), `selectedVeg()` (3746), `setMenuPreview()` (3747), `uploadMenuImage()` (3751), `saveMenuItem()` (3764) | `features/menu` (create sheet) | `POST /menu`, `POST /menu/upload-image` | `v2.editingMenuId`, `v2.menuImageUrl` | not covered |
| `deleteMenuItem()` (3799) | `features/menu` | — (no route; toast only) | — | contract: no `DELETE /menu/:id` |

### 1e. Inventory

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadInventory()` (3876), `renderInventory()` (3885), `updateBulkButtons()` (3905) | `features/inventory` | `GET /menu` (reuse) | `state.menuItems`, `v2.inventorySelected` | `dom.smoke`: inventory sheet |
| `openInventorySheet()` (3809), `syncInventorySheetFields()` (3827), `loadStockHistory()` (3834), `saveInventory()` (3848) | `features/inventory` | `PUT /menu/:id/inventory`, `GET /inventory/history?itemId=` | `v2.pendingInventoryItemId`, `v2.inventoryBusy`, `v2.stockHistory` | `dom.smoke`: per-item inventory posts `stockQuantity` |
| `applyBulkAvailability()` (3910) | `features/inventory` | `PUT /menu/availability/bulk` (fallback `PUT /menu/:id/toggle-stock`) | `v2.bulkBusy` | contract: `v2.bulkBusy` guard |
| `renderRestock()` (3957), `cancelScheduledRestock()` (3989) | `features/inventory` | `PUT /menu/:id/toggle-stock` | — | `dom.smoke`: no `/menu/restock` call |

### 1f. Insights (analytics)

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadAnalytics()` (4018), `renderAnalytics()` (4034) | `features/insights` | `GET /analytics?period=`, `GET /analytics/visits?period=` | — | not covered |

### 1g. Finance

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadEarnings()` (2728), `renderEarningsLedger()` (2746), `money()` (2565), `earningsStatusLabel()` (2566) | `features/finance` (ledger) | `GET /earnings/summary?period=`, `GET /earnings/orders?view=completed&page=1&limit=20` | `state.earningsRows` | `dom.smoke`: finance section boots |
| `loadFinance()` (4097), `renderFinanceSummary()` (4690), `money2()` (4686) | `features/finance` | `GET /settlements/summary` | `v2.finance`, `v2.eligibleBalance`, `v2.availableBalance` | `dom.smoke`: "finance reads the vendor settlement summary…" |
| `loadWithdrawals()` (4132) | `features/finance` | `GET /settlements/withdrawals` | `v2.withdrawals` | `dom.smoke`: last-payout cell |
| `openWithdrawSheet()` (4155), `submitWithdrawal()` (4163) | `features/finance` | `POST /settlements/withdraw` | — | contract: "withdrawal sends only the amount…" |
| `loadPayouts()` (4758), `renderPayoutBatches()` (4732), `setFinanceTab()` (4772), `openPayoutSheet()` (4782), `submitPayoutRequest()` (4791) | `features/finance` (payouts tab) | `GET /settlements/withdrawals`, `POST /settlements/withdraw` | `state.financeTab`, `state.payoutBusy` | not covered |
| `csvCell()` (4818), `downloadCsv()` (4822) | `lib/format` (CSV) | — | — | not covered |
| `openSettlementView()` (4850), `closeSettlementView()` (4868) | `features/finance` (slide-over) | — | — | not covered |

### 1h. Reviews

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadReviews()` (2866) | `features/reviews` | `GET /reviews?page=1&limit=50` | `state.reviews` | not covered directly |
| `renderReviewsList()` (2894), `setReviewTab()` (2931), `reviewCardHtml()` (2842), `reviewScoreOf()` (2808), `reviewScoreClass()` (2811), `reviewCustomerCount()` (2814), `reviewDateLabel()` (2822), `reviewStarsHtml()` (2826, unused), `reviewReplyText()` (2774), `reviewReplyAt()` (2779), `reviewItemRatings()` (2784), `reviewPhotos()` (2788), `reviewPhotosHtml()` (2836), `reviewReplyHtml()` (2829), `reviewMatches()` (2793) | `features/reviews` | — | — | not covered |
| `openReviewView()` (2952), `closeReviewView()` (2985), `submitReviewViewReply()` (2991), `dishRowHtml()` (2941) | `features/reviews` | `POST /reviews/:id/reply` | `state.reviewViewId`, `state.rvDetailed` | contract: `state.reviewReplyBusy` guard |
| `openReviewReply()` (4317), `submitReviewReply()` (4323) | `features/reviews` | `POST /reviews/:id/reply` | `state.reviewReplyBusy` | contract: duplicate-guard test |
| `openPhotoViewer()` (4311) | `features/reviews` | — | — | not covered |
| Complaints: `loadComplaints()` (4561), `complaintCardHtml()` (4574), `openComplaintView()` (4598), `closeComplaintView()` (4630), `openDisputeSheet()` (4636), `submitDispute()` (4648), `complaintCount()` (2889), `complaintCategoryOf`/`complaintDisputeOf`/`complaintIdOf`/`complaintItemsOf`/`complaintMatches`/`complaintPhotosOf`/`complaintPickupPhotoOf`/`complaintRefundOf` (4521–4552) | `features/reviews` (gated tab) | `GET /complaints…`, `POST /complaints/:id/dispute` (**both unreachable — `caps.complaints=false`**) | `state.complaints`, `complaintViewId`, `disputeBusy`, `pendingDisputeId` | contract: gated-path test; `dom.smoke`: `?cap=` test |

### 1i. Support

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadSupport()` (4180), `createSupportTicket()` (4207), `openSupportReply()` (4223), `submitSupportReply()` (4229) | `features/support` | `GET /support`, `POST /support`, `POST /support/:id/reply` | `v2.support`, `v2.pendingSupportId` | not covered |

### 1j. Settings & profile

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `loadSettings()` (4245), `renderSettings()` (4261), `saveSettings()` (4287) | `features/settings` | `GET /settings`, `PUT /settings`, `GET /onboarding/config` | `state.onboarding`, `v2.settings` | `dom.smoke`: "settings save sends only the fields…" |
| `loadProfile()` (3586), `renderProfile()` (3602), `profileRow()` (3598), `openProfileEditor()` (3657), `saveProfile()` (3668) | `features/settings` | `GET /profile`, `GET /restaurant` (fallback), `PUT /restaurant/profile` | `v2.profile`, `v2.profileEditing` | `dom.smoke`: "profile editor writes through…" |
| `loadPolicies()` (3649) | `features/settings` | `GET /policies` | `state.policies` | not covered |
| `renderStore()` (1500), `saveBusinessHours()` (1524), `reflectStatus()` (1416), `openStatusSheet()` (1482), `closeStatusSheet()` (1487), `applyRestaurantStatus()` (1489), `STATUS_LABEL` (1413) | `features/settings` (store) | `PUT /restaurant/availability`, `PUT /restaurant/hours` | `state.currentStatus` | not covered |

### 1k. Notifications & push

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `initPush()` (2216) + `FIREBASE_CONFIG` (1279), `VAPID_KEY` (1287) | `lib/firebase` + `lib/push` | `POST /notifications/register-token` (via `CFG.NOTIFICATIONS_BASE`) | `pushReady` | contract: SW/push files exist |
| `loadNotifications()` (3156), `renderNotificationSheet()` (3141), `renderNotificationBadge()` (3134), `markNotificationsRead()` (3167), `markNotificationsReadBackend()` (3175), `notifReadSet()` (3128), `notifIsRead()` (3129), `openNotifSheet()` (3185), `closeNotifSheet()` (3186) | `features/settings` (notifications) | `GET /notifications`, `PATCH /notifications/:id/read` | `state.notifications`, `NOTIF_READ_KEY` set | not covered |
| `checkVendorNotifications()` (3526) | `features/orders` (poll side-effect) | `GET /notifications` | `eatswada_vendor_seen_notifications` | not covered |
| `startPolling()` (3543), `stopPolling()` (3548), `Alarm` (2187) | `app/providers` (poll loop) + `lib/alarm` | — | `state.pollTimer`, `state.consecutivePollErrors` | contract: `startPolling` presence |

### 1l. Other screens

| Legacy function(s) | Target module | Endpoint(s) | State it owns | Tests today |
| --- | --- | --- | --- | --- |
| `str()` (3569), `num()` (3571), `enumLabel()` (3570), `firstNumber()` (1603), `escapeHtml()` (1566), `safeUrl()` (1571), `formatMoney()` (1559), `timeAgo()` (1553), `formatOrderAddress()` (1561) | `lib/format` | — | — | `contract`: several helper tests |
| `openModal()` (3572), `closeModal()` (3573), `openMoreSheet()` (3576), `closeMoreSheet()` (3577) | `components/ui` (sheet/modal primitives) | — | — | indirect |

---

## 2. `caps` flags and current values

`index.html:1302` — `const caps = Object.freeze({ … })`. **17 flags**, not 10.

| Flag | Value | Backing endpoint / reason |
| --- | --- | --- |
| `prepCountdown` | **true** | `order.prepReadyAt` / `estimatedReadyAt` from `GET /orders` |
| `billBreakdown` | **true** | `order.commission` + `order.bill`/`vendorBill` snapshots |
| `autoRestock` | **true** | `PUT /menu/:id/toggle-stock` accepts `autoTurnOnAt` |
| `selfDeliveryOtp` | **true** | `POST /orders/:id/verify-delivery-otp` |
| `inventoryQty` | **true** | `PUT /menu/:id/inventory` |
| `profileEdit` | **true** | `PUT /restaurant/profile` |
| `settlements` | **true** | `/settlements/summary|withdrawals|withdraw` |
| `complaints` | **false** | backend mounts no vendor complaint route (GAP #3) |
| `menuEdit` | **false** | `PUT /menu/:id` not mounted (GAP #1) |
| `menuDelete` | **false** | `DELETE /menu/:id` not mounted (GAP #2) |
| `menuReorder` | **true** | `PUT /menu/reorder` |
| `serverAlerts` | **true** | `GET /alerts` |
| `serverActivity` | **true** | `GET /activity` |
| `serverDashboard` | **true** | `GET /dashboard` |
| `serverCapacity` | **true** | `GET /capacity` |
| `onboardingConfig` | **true** | `GET /onboarding/config` |
| `policies` | **true** | `GET /policies` |

The object is `Object.freeze`d and there is deliberately **no** URL query
override (`?cap=` is explicitly forbidden and tested).

> ⚠️ **Documentation drift found (recon).** `VENDOR-API-CONTRACT.md` and
> `TEST-REPORT.md` describe a **10-flag** capability set
> (`autoRestock, billBreakdown, complaints, inventoryQty, menuDelete, menuEdit,
> prepCountdown, profileEdit, selfDeliveryOtp, settlements`), and
> `tests/contract.test.mjs` asserts exactly that closed set. The live
> `index.html` now has **17** flags, so `npm test` currently reports
> **44 tests / 43 pass / 1 fail** — the failing test is
> `unsupported backend features are capability-gated`. The 7 new flags
> (`menuReorder`, `serverAlerts`, `serverActivity`, `serverCapacity`,
> `serverDashboard`, `onboardingConfig`, `policies`) are undocumented.
> This is a **doc/test inconsistency in the repo, not something this recon
> introduced.** Recorded in `OPEN_QUESTIONS.md`.

---

## 3. Order flow logic

### 3a. Tabs (`el.tabs`, `index.html:624–629`) and membership rules

| Tab (`data-tab`) | Counter | Membership predicate | Endpoint source |
| --- | --- | --- | --- |
| `new` | `#countNew` | `status === 'placed' && !isScheduledOrder(o)` | `GET /orders?view=queue` |
| `preparing` | `#countPreparing` | `isPreparingOrder(o)` | queue |
| `ready` | `#countReady` | `isReadyOrder(o)` | queue |
| `dispatch` | `#countDispatch` | `status === 'out_for_delivery'` | queue |
| `scheduled` | `#countScheduled` | `isScheduledOrder(o)` | queue |
| `history` | — | `state.history` (paginated) | `GET /orders?view=history&page&limit=20` |

Predicates (never re-derived from status alone where a server flag exists):

- `isScheduledOrder(o)` — `status ∈ {placed, confirmed}` **and** a future
  `scheduledAt | scheduledFor | deliverySlotAt | deliverySlot.startAt`.
- `isReadyOrder(o)` — excludes `out_for_delivery`/`placed`; true when
  `isFoodReady === true` or `status ∈ {ready_for_pickup, waiting_for_rider}`;
  for `assigned` only when `isFoodReady !== false`.
- `isPreparingOrder(o)` — not ready, not scheduled, and
  `status ∈ {confirmed, preparing}` or `assigned` with `isFoodReady === false`.
- `dispatch` is `out_for_delivery` only.

The live queue is uncapped; only `history` paginates. `renderActiveTab()` shows
a "No matches" panel when a search filters everything out, otherwise
`renderEmpty(tab)` per-tab copy from `EMPTY_COPY`.

### 3b. Allowed actions per status (`renderTicket()`, 1976–2076)

| `order.status` | Rendered footer / control | Endpoint | Gate |
| --- | --- | --- | --- |
| `placed` | `Reject` + `Accept` buttons (+ 5-min response-window strip) | `PUT /orders/:id/reject`, `PUT /orders/:id/accept` | buttons disabled once `restaurantResponseDeadline` (or `createdAt + 5 min`) has passed |
| `confirmed` | `Start preparing` (`data-action="advance"`) | `PUT /orders/:id/status` `{status:'preparing'}` | `ADVANCE_TARGET.confirmed` |
| `preparing` | `Order Ready (mm:ss)` KPT button; `+5 min` extend chip on the prep strip | `PUT /orders/:id/ready`, `PUT /orders/:id/extend-prep` | KPT label only when `caps.prepCountdown` and a future deadline |
| `waiting_for_rider` | static badge "Food ready · Finding a rider…" | — | — |
| `assigned` | static badge "Rider assigned" | — | — |
| `out_for_delivery` | `Verify delivery PIN` **or** static "Picked up · Out for delivery" | `POST /orders/:id/verify-delivery-otp` | `isSelfDeliveryOrder(order) && caps.selfDeliveryOtp` |
| `otp_verified` | `Mark delivered` (`data-action="advance"`) | `PUT /orders/:id/status` `{status:'delivered'}` | `ADVANCE_TARGET.otp_verified` |
| `delivered` | static badge "Delivered" | — | — |
| `cancelled` | static badge "Cancelled" (+ reason note if present) | — | — |

`ADVANCE_TARGET = { confirmed: 'preparing', otp_verified: 'delivered' }` — the
client asserts the server's own transition map so it can skip a pointless
round-trip; the request body is only a hint, the server derives the target.

### 3c. 15-second undo-ready window (`showUndoReadyToast`, 2478)

- `markOrderReady()` calls `PUT /orders/:id/ready`, shows a success toast, then
  appends an `.undo-toast` with a `Undo Ready (Ns)` button.
- A `setInterval` decrements `remaining` from **15** once a second; at `0` the
  timer is cleared and the toast removed.
- Clicking the button (while the window is open) calls
  `PUT /orders/:id/undo-ready`, clears the timer, and reloads the queue.
- Both ready and undo are single-flight via `state.actionBusy.has(id)`.
- Server-side: the route only accepts the undo within its own 15-second window;
  the client toast is the mirror of that window.

### 3d. One-time extend-prep (`extendPrep`, 2507)

- Guarded by `state.actionBusy.has(id) || state.extendedPrep.has(id)` → a second
  tap is a no-op.
- On success the order id is added to `state.extendedPrep`, which both disables
  the chip (`.extend-chip.used`, `disabled`, label "+5 min added") and persists
  for the session (it is **not** persisted across reloads).
- Server-side: `PUT /orders/:id/extend-prep` is one-time and returns
  `409 PREP_EXTENSION_ALREADY_USED` on reuse; `order.prepTimeExtended` also
  reflects it server-side.

### 3e. Self-delivery OTP gating

- Button visibility: `isSelfDeliveryOrder(order) && caps.selfDeliveryOtp`
  (`renderTicket`, ~2006).
- `isSelfDeliveryOrder(order)` (1881): the restaurant's **current**
  `deliveryMode` wins (`self_delivery` → true, `eatswada_rider` → false);
  `order.deliveryModeSnapshot` is only the fallback before the restaurant loads.
  This mirrors the server, which returns `409` unless the current mode is
  `self_delivery`.
- `openOtpSheet()` clears the input and error; `verifyDeliveryOtp()` validates
  `/^\d{4}$/`, is single-flight via `v2.otpBusy`, posts `{otp}` to
  `POST /orders/:id/verify-delivery-otp`, and on success tells the vendor to
  press `Mark delivered`. The PIN is never stored or echoed.

### 3f. Prep countdown

- `prepStripHtml(order)` (1731) renders a `.prep-strip[data-prep-deadline]` only
  for `confirmed`/`preparing` when `caps.prepCountdown` and a deadline exists.
- Deadline source: `prepDeadlineOf()` = first of `estimatedReadyAt`,
  `prepReadyAt`, `readyAt` (server timestamps — a reload restores the true
  remaining time; the ticking clock never writes back).
- `startPrepTimer()` (2296) ticks every 1 s, updating the clock, the title
  ("Preparing" → "Prep time overdue"), the subtitle ("Ready in about N min"),
  the progress fill (from `data-prep-start`), and the `due-soon` class
  (`remaining <= 3 min`).
- The KPT CTA (`startKptTimer`, 1951) shares the same deadline and drives a
  split-fill `--kpt-pct`; the label reads `Order Ready (mm:ss)`.

---

## 4. New-order alarm and polling

### 4a. Alarm (`Alarm` IIFE, 2187–2207)

- Web Audio API: `unlock()` lazily creates/resumes an `AudioContext`;
  `chime()` plays two sine tones (880 Hz @ 0 s, 1245 Hz @ 0.18 s).
- `pulse()` = chime + `navigator.vibrate([350,130,350])`.
- `start(count)` — sets `#alarmText` to "N new orders waiting" (or "New order
  waiting"), shows `#alarmBar`, calls `pulse()` immediately, then repeats
  `pulse()` every **1600 ms** while active (sound loop).
- `stop()` — clears the interval, cancels vibration, hides `#alarmBar`.
- `#alarmStopBtn` (line 2211) → `Alarm.unlock(); Alarm.stop(); switchSection('orders')`.
- Audio is unlocked on the first `pointerdown` (browsers block autoplay
  otherwise, handler `firstGesture`, line 2209) and `initPush()` is also armed on
  the first `pointerdown` (handler `enableVendorPush`, line 2210).
- Trigger points: `updateCounts()` (when the placed count rises),
  `checkVendorNotifications()`, and the FCM foreground handler `messaging.onMessage`.
  `updateCounts()` also calls `Alarm.stop()` when the placed count reaches 0.

### 4b. Polling (`startPolling`, 3543)

- `POLL_INTERVAL = 15000` ms from `config.js` (`CFG.POLL_INTERVAL`).
- A self-rescheduling `setTimeout` loop: each tick, **if the tab is visible and
  online**, it awaits `loadQueue(false)` then `checkVendorNotifications()`.
- Backoff: `delay = min(POLL_INTERVAL * 2^min(consecutivePollErrors, 4), 120000)`
  → up to **120 s** after repeated failures. `consecutivePollErrors` resets to 0
  on a successful queue load.
- `stopPolling()` clears the timer; called on `logout()`, `beforeunload`, and
  `handleUnauthorized()`.
- `visibilitychange` (visible) triggers an immediate `loadQueue(false)`.
- `online` event → `loadQueue(false)` (+ `loadMenu()` if the menu section is open).
- `checkVendorNotifications()` polls `GET /notifications`, dedupes via the
  `eatswada_vendor_seen_notifications` localStorage set, and on a fresh
  `new_order` notification reloads the queue, starts the alarm, and shows a toast.

---

## 5. Auth / session flow, and the apply flows

### 5a. Login (`login.html`)

- `AUTH_BASE = CFG.AUTH_BASE` = `<origin>/api/auth`.
- Submit → `POST {AUTH_BASE}/vendor/login` with `{email, password}` (15 s
  AbortController timeout). On `res.ok && body.success`:
  - `localStorage.setItem('nearbite_vendor_token', body.token)`
  - `localStorage.setItem('nearbite_vendor_user', JSON.stringify(body.user))` if present
  - `localStorage.setItem('nearbite_vendor_restaurant', JSON.stringify(body.restaurant))` if present
  - redirect `window.location.href = 'index.html'`
- **Session restore** (`checkExistingSession()`): if a token exists, `GET
  {API_BASE}/restaurant` with the bearer header. `res.ok` → redirect to
  `index.html`; `401`/`403` → `localStorage.removeItem(TOKEN_KEY)`; network
  error → overlay hidden (never trap the vendor). `?reason=session_expired`
  shows a banner.
- Password visibility toggle, inline validation (`EMAIL_RE`), offline banner,
  spinner state.

### 5b. Token keys (exact, must be preserved)

| Key | Written by | Read by |
| --- | --- | --- |
| `nearbite_vendor_token` | `login.html:282` | `authHeaders()`, `apiFetch()`, `menuFetch()`, `init()`, `logout()`, `initPush()`, `handleUnauthorized()` |
| `nearbite_vendor_user` | `login.html:283` | cleared by `handleUnauthorized()`/`logout()` (not otherwise read) |
| `nearbite_vendor_restaurant` | `login.html:284` | cleared by `handleUnauthorized()`/`logout()` (not otherwise read) |

`config.js` also exposes `USER_KEY` and `RESTAURANT_KEY` constants for these two
keys, but `index.html`/`login.html` use the **string literals**, not the
constants (drift noted in `OPEN_QUESTIONS.md`).

### 5c. `handleUnauthorized()` (1396)

```
localStorage.removeItem(TOKEN_KEY)
localStorage.removeItem('nearbite_vendor_user')
localStorage.removeItem('nearbite_vendor_restaurant')
stopPolling()
if (!location.pathname.endsWith('/login.html'))
  location.replace('login.html?reason=session_expired')
```

Called from `fetchJson()` whenever `res.status === 401` (so it covers every
`apiFetch`/`menuFetch`/direct `fetchJson` call) and from `apiFetch`/`menuFetch`
when the token is already missing.

### 5d. Apply flow (`apply.html`, `APPLICATIONS_BASE` = `<origin>/api/vendor-applications`)

- 8-step wizard (`TOTAL_STEPS = 8`) with per-step validation and a review step.
- Submit → `POST {APPLICATIONS_BASE}` with
  `{ownerName, email, phone, password, restaurantName, cuisine, description,
  address, fssaiLicenseNumber, deliveryMode (self_delivery|eatswada_rider),
  openingHours, location:{type:'Point', coordinates:[lon,lat]}}`
  (20 s timeout; single-flight via `state.inFlight`/`state.submitted`).
- On success: stores `sessionStorage['eatswada_vendor_application_id']` and
  `sessionStorage['eatswada_vendor_application_status_token']`, clears the local
  draft, shows the reference id + "PENDING REVIEW".
- Local correction draft (never the password) in
  `localStorage['eatswada_vendor_application_draft_v1']`, restored on load.
- Geolocation via `navigator.geolocation.getCurrentPosition` (requires HTTPS).

### 5e. Application status (`application-status.html`)

- Reads `sessionStorage` for the saved id + status token and prefills.
- Check → `GET {APPLICATIONS_BASE}/{id}/status?statusToken={token}`.
- Renders only known statuses (`draft, submitted, under_review, pending,
  needs_changes, more_information_required, approved, rejected`); unknown values
  fall through to a safe uppercase label. Shows `changeRequest` and
  `rejectionReason` when present. No auth required.

---

## 6. Every localStorage / sessionStorage key

| Key | Storage | Written | Read | Purpose |
| --- | --- | --- | --- | --- |
| `nearbite_vendor_token` | localStorage | `login.html:282` | everywhere (auth) | Bearer token |
| `nearbite_vendor_user` | localStorage | `login.html:283` | cleared on 401/logout | cached user object |
| `nearbite_vendor_restaurant` | localStorage | `login.html:284` | cleared on 401/logout | cached restaurant object |
| `eatswada_vendor_read_notifications` (`NOTIF_READ_KEY`) | localStorage | `index.html:3171,3182` | `notifReadSet()` | optimistic read cache (server `readAt` is truth) |
| `eatswada_vendor_seen_notifications` | localStorage | `index.html:3534` | `checkVendorNotifications()` | dedupe for the alarm poll |
| `eatswada_vendor_rush_mode` (`RUSH_KEY`) | localStorage | `index.html:4495` | `index.html:5041` | Kitchen Rush Mode flag (`'1'`/`'0'`) |
| `eatswada_vendor_application_draft_v1` (`DRAFT_KEY`) | localStorage | `apply.html:416` | `apply.html:421` | non-password correction draft |
| `eatswada_vendor_application_id` | sessionStorage | `apply.html:572` | `application-status.html:18` | submitted application id |
| `eatswada_vendor_application_status_token` | sessionStorage | `apply.html:573` | `application-status.html:19` | status-check token |

No other storage keys are used anywhere in the repo (verified by grep across
`index.html`, `login.html`, `apply.html`, `application-status.html`, `config.js`).

---

## 7. Dead / unused / inconsistent code (recon findings)

Nothing below is fixed by this phase — it is a list for the rebuild.

1. **`native-push-vendor.js` is dead.** It is the **admin** push bridge (it reads
   `nearbite_admin_token` / `window.AdminAuth`, sets `hash = 'manage-orders'` /
   `'vendor-applications'`). It is **not** staged by `scripts/prepare-www.mjs`
   and is **not** referenced by any HTML. Its only reference in the repo is the
   existence assertion in `tests/contract.test.mjs:28`. `native-push.js` (the
   vendor bridge) is the one that is staged and injected.
2. **`reviewStarsHtml()` (index.html:2826) is defined but never called.**
3. **`state.capabilities` (index.html:1351)** is set to `caps` but never read;
   every caller reads the module-level `caps` directly.
4. **`state.orderQueryRequest` / `state.orderQueryResults` (index.html:1349)**
   are declared but never read or written again — leftovers from a
   server-backed search that no longer exists (search is client-side only).
5. **`state.menuOnlineCount` (index.html:1356)** is only ever *read*
   (`renderOnlinePill`, 4511) and never assigned → dead fallback branch.
6. **`state.pendingRestockWasInStock` (index.html:1355)** is declared but never
   used.
7. **`config.js` references an undefined `RENDER_API_ORIGIN`.** Line 17 uses it
   but only `AWS_API_ORIGIN` is declared, so `ACTIVE_API = 'render'` would
   silently select `undefined` and blank the API base. Currently harmless
   because `ACTIVE_API = 'aws'`.
8. **`config.js` exports `USER_KEY` / `RESTAURANT_KEY`** but the pages hardcode
   the equivalent string literals instead of reading those constants.
9. **`firebase-messaging-sw.js` is staged but never registered by any page.**
   `index.html` registers `./sw.js` (root scope) for both the cache worker and
   FCM; the `./fcm/`-scope worker this file was written for is not wired up.
10. **`sw.js` and `firebase-messaging-sw.js` embed the Firebase web config
    inline** (`apiKey`, `appId`, etc.), duplicated in `index.html`
    (`FIREBASE_CONFIG`) and `native-push*.js`. Per `AGENTS.md` rule 9 this must
    move to `VITE_FIREBASE_*` / one `src/lib/firebase.ts` at cutover.
11. **`RESTOCK_LABEL`/`nextOpeningAt` are partly vestigial** — `nextOpeningAt`
    is still used by `restockTimestampFor('next_open')`, but the *bulk* restock
    panel (`renderRestock`) is fully disabled (GAP #4), so the delay/cancel
    controls there are inert UI.
12. **The Complaints console is fully unreachable** (`caps.complaints = false`):
    `loadComplaints`, `submitDispute`, `openComplaintView`, `complaintCardHtml`
    and all `complaint*Of` helpers are dead code in practice.
13. **`deleteMenuItem()`** can only toast an error (no mounted route) — retained
    only to satisfy the contract test that asserts no `DELETE /menu/:id` is sent.
14. **`tests/H`** is a stray 1-byte file in `tests/` (not a test).
15. **Capability-flag doc/test drift** — see the ⚠️ note in §2: the docs and
    `contract.test.mjs` pin a 10-flag set, the code has 17. `npm test` fails
    one assertion as a result.
16. **`.gitignore` is absent in the working tree** although `CHANGES.md` lists it
    as added; `node_modules/` and `package-lock.json` are currently untracked.
17. **The native-push custom events have no listener.** `native-push.js` (and
    `native-push-vendor.js`) dispatch `eatswada:push-received` and
    `eatswada:push-opened`, but nothing in the app listens for either, so
    native push only produces OS notifications and never updates the in-app
    order list.
18. **`GET /dashboard`, `/alerts`, `/activity`, `/onboarding/config`, `/policies`
    and `PUT /menu/reorder` are called by the app but are absent from
    `VENDOR-API-CONTRACT.md`'s tables** (only `/capacity` and `/menu/reorder`
    appear). They *are* in the contract test's mounted-route allow-list, so the
    test passes but the written contract is behind the code. The rebuild must
    treat these six as documented-but-unwritten.
19. **`PUT /orders/:id/accept` sends an extra `prepTimeMinutes` field** alongside
    the contracted `prepMinutes` (`index.html:2412`). Only `prepMinutes` is in
    `VENDOR-API-CONTRACT.md`.
20. **The 5-minute response window is client-derived.** `restaurantResponseDeadline`
    is read but never appears in the contract; when the server does not send it,
    the app invents `createdAt + 5 min` and disables Accept/Reject. Also
    `order.isFoodReady` / `status === 'ready_for_pickup'` drive the Ready tab but
    are not in the contract's status flow.
