/**
 * Backend capability flags.
 *
 * Each flag states whether the Eatswada backend actually exposes the route the
 * feature needs. A `false` flag means NO request is sent and no unverified
 * figure is shown; the UI states the gap instead.
 *
 * The object is frozen and there is deliberately NO URL query-parameter or
 * other runtime override, so a crafted link (`?cap=...`) cannot turn on an
 * unverified backend request. See docs/rebuild/PORTING_MAP.md §2.
 */
export const caps = Object.freeze({
  // order.prepReadyAt / estimatedReadyAt are returned by GET /orders
  prepCountdown: true,
  // order.commission + order.bill snapshots are returned by GET /orders
  billBreakdown: true,
  // PUT /menu/:id/toggle-stock accepts { autoTurnOnAt }
  autoRestock: true,
  // POST /orders/:id/verify-delivery-otp (self-delivery restaurants only)
  selfDeliveryOtp: true,
  // PUT /menu/:id/inventory accepts stockQuantity/trackStock/lowStockThreshold
  inventoryQty: true,
  // PUT /restaurant/profile (vendor allow-list: name, address, phone, …)
  profileEdit: true,
  // GET /settlements/summary, /settlements/withdrawals, POST /settlements/withdraw
  settlements: true,
  // NOT SUPPORTED: the backend mounts no vendor complaint route.
  complaints: false,
  // NOT SUPPORTED: updateVendorMenuItem exists but PUT /menu/:id is not mounted.
  menuEdit: false,
  // NOT SUPPORTED: deleteVendorMenuItem exists but DELETE /menu/:id is not mounted.
  menuDelete: false,
  // PUT /menu/reorder accepts { items: [{ id, sortOrder }] }
  menuReorder: true,
  // GET /alerts — server-authoritative attention list.
  serverAlerts: true,
  // GET /activity — the VendorActivity audit log.
  serverActivity: true,
  // GET /dashboard — today's summary + pending settlement + alert counts.
  serverDashboard: true,
  // GET /capacity — canonical activeStatuses for the "active orders" count.
  serverCapacity: true,
  // GET /onboarding/config — settlement schedules, capacity bounds, policies.
  onboardingConfig: true,
  // GET /policies — accepted policy version ids + profile policy URLs.
  policies: true,
} satisfies Record<string, boolean>);

export type Caps = typeof caps;
export type CapName = keyof Caps;
