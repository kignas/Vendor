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

## Verified backend capability map (live API probe)
Auth-gated routes that exist:
- `GET /api/vendor/restaurant`
- `GET /api/vendor/menu`, `PUT /api/vendor/menu/:id/toggle-stock`
- `GET /api/vendor/orders?view=queue|history`, `PUT /api/vendor/orders/:id/accept|reject|status`
- `GET /api/vendor/earnings/summary`, `GET /api/vendor/earnings/orders`
- `GET /api/vendor/reviews`
- `PUT /api/vendor/restaurant/availability`, `PUT /api/vendor/restaurant/hours`
- `GET /api/notifications`, `POST /api/notifications/register-token`
- `POST /api/vendor-applications`, `GET /api/vendor-applications/:id/status`

Not available yet (return 404) — do not build UI that calls these:
- `/api/vendor/inventory`
- `/api/vendor/settings`
- `/api/vendor/earnings/settlements`
- `/api/vendor/withdrawals`
- `/api/vendor/support`, `/api/vendor/support/tickets`
- `/api/vendor/documents`
- `/api/vendor/application`
- `/api/vendor/dashboard`
- `/api/vendor/menu/categories`
- `/api/vendor/notifications`

## Blocked modules (until the endpoints above exist)
- Menu add/edit/upload/approval (only stock toggle is supported)
- Inventory management
- Restaurant settings beyond availability + opening hours
- Earnings settlements / withdrawals
- Customer support tickets
- Document verification status
- Registration fields: delivery-method persistence, PAN, bank, GSTIN,
  FSSAI certificate upload, photographs, preparation time, maximum active
  orders, delivery radius
