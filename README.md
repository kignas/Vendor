# Eatswada Vendor — Production Final

## Vendor permissions
- Login with existing vendor authentication.
- View only the vendor's own restaurant orders.
- Accept or reject newly placed orders.
- Advance orders: confirmed -> preparing -> waiting for rider.
- View waiting/assigned/out-for-delivery orders and history.
- View customer restaurant notes on the vendor's own order.
- Toggle menu item stock availability only.

## Vendor cannot
- Add menu items
- Edit menu item details
- Change prices or discounts
- Delete menu items
- Upload images
- Change restaurant profile/settings
- Change restaurant ownership or IDs

These restrictions are enforced by backend routes, not only by the UI.

## PWA
The portal includes a manifest and service worker so the vendor can install it from a mobile browser as an app-like experience. API calls remain network-backed; the service worker does not cache authenticated API responses.

## Deployment
1. Deploy the vendor folder to the vendor web host.
2. Keep the existing vendor login filename and token key unchanged.
3. Deploy the four backend changes to the existing Eatswada Render backend.
4. Do not replace or delete Render environment variables.
5. Run the backend syntax, launch and security gates before production deployment.

## Frontend configuration
- Every API host lives in `config.js` only. `ACTIVE_API` is `'render'`
  (`https://eatswada.onrender.com`), the only host wired up in this build.
- The Render host can be overridden with `window.EATSWADA_RENDER_ORIGIN` before
  `config.js` loads. Pages read `window.EATSWADA_CONFIG`; components do not
  hardcode URLs. If the selected host is unset the portal fails loudly
  (`CONFIG_ERROR`) instead of silently falling back to another host.
- `config.js` derives `API`, `API_BASE`, `AUTH_BASE`, `APPLICATIONS_BASE` and
  `NOTIFICATIONS_BASE` from one origin. Always read these keys — never rebuild a
  URL from a literal host.

## Verified backend capability map (live API probe)
Auth-gated routes that exist:
- `GET /api/vendor/restaurant`
- `GET /api/vendor/menu`, `PUT /api/vendor/menu/:id/toggle-stock`
- `GET /api/vendor/orders?view=queue|history`, `PUT /api/vendor/orders/:id/accept|reject|status`
- `GET /api/vendor/earnings/summary`, `GET /api/vendor/earnings/orders`
- `GET /api/vendor/reviews`
- `PUT /api/vendor/restaurant/availability`, `PUT /api/vendor/restaurant/hours`
- `GET /api/notifications`, `POST /api/notifications/register-token`
- `POST /api/vendor-applications` — creates an application, **and updates it in place when the
  body carries the existing `id`** (this is the correction/resubmission mechanism)
- `GET /api/vendor-applications/:id/status?statusToken=...` — returns `status`,
  `changeRequest`, `rejectionReason` and submission metadata

Exists but auth-gated — **contract not yet exercised** (answers 401, not 404). Do not build UI
on these until a real vendor token can test them:
- `GET /api/vendor-applications/:id`, `GET /api/vendor-applications/mine`
- `GET /api/vendor/dashboard`
- `GET /api/vendor/settings`, `PUT /api/vendor/settings/*`
- `POST /api/vendor/menu`, `PUT /api/vendor/menu/:id`

Still 404 — do not build UI that calls these:
- `/api/vendor/inventory`
- `/api/vendor/earnings/settlements`
- `/api/vendor/withdrawals`
- `/api/vendor/support`, `/api/vendor/support/tickets`
- `/api/vendor/documents`
- `/api/vendor/menu/categories`
- `PUT/PATCH/DELETE /api/vendor-applications/:id` (and `/resubmit`, `/edit`)

## Blocked modules (until verified)
- Menu add/edit/upload/approval (only stock toggle is verified today)
- Inventory management
- Restaurant settings beyond availability + opening hours
- Earnings settlements / withdrawals
- Customer support tickets
- Document verification status

## Never collected (product rule, not a backend gap)
- Business PAN, GST/GSTIN, bank account / settlement details, commission,
  minimum order value, delivery fee, free-delivery threshold
- FSSAI certificate uploads and owner identity-document uploads

## Application registration fields (persisted)
`ownerName`, `email`, `phone`, `password`, `restaurantName`, `businessType`
(`restaurant` | `cloud_kitchen`), `cuisine`, `description`, `address`,
`fssaiLicenseNumber`, `deliveryMode` (`self_delivery` | `eatswada_rider`),
`openingHours`, `location`. Anything outside this list is not collected.
