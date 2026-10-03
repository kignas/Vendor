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
- Every API host lives in `config.js` only. The active host is selected by
  `ACTIVE_API` — `'render'` by default (`https://eatswada.onrender.com`); set
  it to `'aws'` for `https://api.eatswada.com`. One line switches hosts.
- The Render host can be overridden with `window.EATSWADA_RENDER_ORIGIN` before
  `config.js` loads. Pages read `window.EATSWADA_CONFIG`; components do not
  hardcode URLs. If the selected host is unset the portal fails loudly
  (`CONFIG_ERROR`) instead of silently falling back to another host.

## Verified backend capability map (live Render probe, `https://eatswada.onrender.com`)

Route existence verified by HTTP status (401 = auth-gated & present, 404 = absent).
Public model shapes (restaurant, menu item, review) were read from the
unauthenticated `/api/restaurants` endpoints.

Present (auth-gated):
- `GET /api/vendor/restaurant`
- `GET /api/vendor/profile`
- `GET|PUT /api/vendor/settings`
- `GET /api/vendor/menu` · `POST /api/vendor/menu` · `PUT|DELETE /api/vendor/menu/:id` · `PUT /api/vendor/menu/:id/toggle-stock` · `POST /api/vendor/menu/upload-image` (multipart `image`)
- `GET /api/vendor/orders` (`?view=queue|history`) · `PUT /api/vendor/orders/:id/accept|reject|status`
- `GET /api/vendor/earnings/summary` · `GET /api/vendor/earnings/orders`
- `GET /api/vendor/analytics?period=7d|30d|90d|all`
- `GET /api/vendor/settlements/summary` · `GET /api/vendor/settlements/withdrawals` · `POST /api/vendor/settlements/withdraw`
- `GET /api/vendor/reviews` · `POST /api/vendor/reviews/:id/reply` (`{ message }`, 1–500 chars)
- `GET|POST /api/vendor/support` · `POST /api/vendor/support/:id/reply`
- `PUT /api/vendor/restaurant/availability` · `PUT /api/vendor/restaurant/hours`
- `GET /api/notifications` · `PATCH /api/notifications/:id/read` · `POST /api/notifications/register-token`
- `POST /api/vendor-applications` · `GET /api/vendor-applications/:id/status?statusToken=`

Absent (404) — no UI calls these:
- `/api/vendor/inventory`, `/api/vendor/documents`, `/api/vendor/menu/categories`
- `PUT /api/vendor/profile`, `PUT|PATCH /api/vendor/restaurant` (profile edits)
- `/api/vendor/settlements/withdraw` (GET), `/api/vendor/withdrawals`
- `/api/vendor/support/tickets`, `/api/vendor/notifications`
- bulk endpoints (`/api/vendor/menu/bulk`, `/api/vendor/bulk-availability`)

## Modules implemented against the live backend
- Dashboard (real orders + earnings), Orders (unchanged), Menu CRUD + image
  upload + approval badges, Inventory (stock view + bulk availability via the
  per-item stock endpoint), Earnings, Settlements & Withdrawals, Analytics,
  Reviews + replies, Notifications (mark-read), Support tickets, Restaurant
  profile/status/hours, Settings, Alerts, Activity.

## Backend dependencies (not faked)
- **Menu item approval field**: the public menu shape has no approval field; the
  UI shows an approval badge only when the backend returns one.
- **Inventory quantities / low-stock thresholds**: no inventory endpoint — the
  Inventory view is built from menu `inStock` and the toggle-stock endpoint.
- **Profile editing**: no vendor profile-update route; profile is read-only.
- **Withdrawal / support / settings request bodies**: endpoints exist and the UI
  is wired to them, but response/request field names could not be inspected
  without a vendor account and are coded defensively.
- **Registration**: PAN, GST, bank details, document uploads and commission are
  deliberately not collected (admin-managed), per product rules.
