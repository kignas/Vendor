# Eatswada Vendor — API reference (internal, for frontend engineers)

Every Vendor API request goes through `window.EATSWADA_CONFIG` only. No page in this repo
hardcodes an API origin. The active host is chosen in `config.js` by one line:

`config.js:23` — `ACTIVE_API = 'render'` → Render host `https://eatswada.onrender.com/api`

Switching back to AWS later is a one-line change in `config.js` — not a search-and-replace
across the app.

## Central config surface

All pages import `config.js`:

```text
<script src="./config.js"></script>
```

Pages read these keys:

- `EATSWADA_CONFIG.API_ORIGIN` — base origin (empty on CONFIG_ERROR)
- `EATSWADA_CONFIG.API` — origin + `/api`
- `EATSWADA_CONFIG.API_BASE` — `API + '/vendor'`
- `EATSWADA_CONFIG.AUTH_BASE` — `API + '/auth'`
- `EATSWADA_CONFIG.APPLICATIONS_BASE` — `API + '/vendor-applications'`
- `EATSWADA_CONFIG.NOTIFICATIONS_BASE` — `API + '/notifications'`
- `EATSWADA_CONFIG.TOKEN_KEY` — localStorage key = `nearbite_vendor_token`
- `EATSWADA_CONFIG.USER_KEY` — `nearbite_vendor_user`
- `EATSWADA_CONFIG.RESTAURANT_KEY` — `nearbite_vendor_restaurant`
- `EATSWADA_CONFIG.POLL_INTERVAL` — 15000 ms
- `EATSWADA_CONFIG.CONFIG_ERROR` — non-null only when the active host is unset; in that case
  the portal refuses to make any network call silently

## Authentication

### Login

Path: `AUTH_BASE + '/vendor/login'`
Method: `POST`
Body: `{ email, password }`
Headers: `Content-Type: application/json`, `Accept: application/json`
On success:
- `localStorage.setItem(TOKEN_KEY, body.token)`
- `localStorage.setItem(USER_KEY, JSON.stringify(body.user))` if present
- `localStorage.setItem(RESTAURANT_KEY, JSON.stringify(body.restaurant))` if present
- redirects to `index.html`

### Session restore (login.html)

Before showing the form, login.html verifies a stored token by calling a protected resource:

Path: `API_BASE + '/restaurant'`
Method: `GET`
Headers: `Accept: application/json`, `Authorization: Bearer <token>`
If OK → redirect to `index.html`.
If 401/403 → remove token from localStorage, keep overlay hidden.

On the dashboard, `index.html` uses the same pattern via `apiFetch('/restaurant')`.

### Logout

`index.html: logout()` clears:
- `nearbite_vendor_token`
- `nearbite_vendor_user`
- `nearbite_vendor_restaurant`
and redirects to `login.html`.

## Dashboard (index.html)

All dashboard fetches go through `apiFetch(path, options)`:
```text
apiFetch(path) = fetchJson(API_BASE + path, { headers: authHeaders(), ... })
authHeaders() = token ? { Authorization: 'Bearer ' + token } : {}
fetchJson(url, options) = fetch(url, { headers: {...}, signal: AbortController, ... })
```

### Restaurant profile
- `GET /api/vendor/restaurant` → `res.data` is the restaurant object.
  Used in `loadRestaurant()`. The code reads `res.data`:
  - `.name` → restaurant header
  - `.availability` or `.isOpen` → current status pill
  - `.openingHours` → store hours editor
  - `.fssaiLicenseNumber` / `.fssai` → docs pill
  - `.isVerified` → verification badge
  - `.applicationStatus` → application status line

### Orders
- `GET /api/vendor/orders?view=queue` → `res.data` → `state.queue`
- `GET /api/vendor/orders?view=history` → `res.data` → `state.history`
- `PUT /api/vendor/orders/:id/accept` — body `{ prepMinutes }`
- `PUT /api/vendor/orders/:id/reject` — body `{ reason }`
- `PUT /api/vendor/orders/:id/status` — body not specified by frontend (empty PUT from frontend)

Order object fields used by renderTicket():
- `.status`
- `.publicOrderId` / `.orderNumber` / `.id`
- `.publicShipmentId` / `.shipmentId`
- `.createdAt`
- `.items[]` → `.name`, `.quantity`
- `.customerPhone`
- `.customerName` / `.user.name`
- `.deliveryAddress` (object with tag/house/line1/street/area/landmark/city/pincode)
- `.restaurantNote`
- `.total`
- `.cancelReason`

Order status values used in UI:
`placed`, `confirmed`, `preparing`, `waiting_for_rider`, `assigned`, `out_for_delivery`, `delivered`, `cancelled`

### Earnings
- `GET /api/vendor/earnings/summary?period=...`
  - `period` values used: `today`, `7d`, `30d`, `all`
  - expected shape: `res.data.current.{ deliveredFoodSales, deliveredCommission, deliveredEarnings, inProgress }`
- `GET /api/vendor/earnings/orders?view=completed&page=1&limit=20`
  - expected shape: `res.data[]` → `.orderNumber`, `.createdAt`, `.status`, `.foodSales`, `.commission`, `.restaurantNetAmount`

### Reviews
- `GET /api/vendor/reviews?page=1&limit=50` → `res.data[]`
  - used fields: `.rating`, `.user.name`, `.comment`, `.createdAt`

### Restaurant status + hours
- `PUT /api/vendor/restaurant/availability` — body `{ status }`; statuses used: `open`, `busy`, `closed_today`, `temporarily_closed`
- `PUT /api/v vendor/restaurant/hours` — body `{ openingHours: { monday:{ closed, opensAt, closesAt }, ... } }`

### Notifications
- `GET /api/notifications` — `res.data[]`
- `POST /api/notifications/register-token` — body `{ token }` (Firebase push token)

### Menu (limited)
- `GET /api/vendor/menu` → `res.data[]`
  - used fields: `_id`, `.name`, `.category`, `.price`, `.inStock`
- `PUT /api/vendor/menu/:id/toggle-stock`
  - only allowed menu mutation in frontend today
  - UI: checkbox on each menu card

### Restaurant docs pill
The overview "Document & account status" pill uses the restaurant object only:
- `fssaiLicenseNumber` or `fssai` → "FSSAI on file"
- `typeof isVerified === 'boolean'` → "Verified" / "Verification pending"
- `applicationStatus` → "Application: <status>"

## Vendor application

Public endpoints (no auth required):
- `POST /api/vendor-applications` — submit new application
  - used by `apply.html`
  - expected success shape: `{ success: true, data: { id, statusToken, status } }`
- `GET /api/vendor-applications/:id/status?statusToken=...` — check status
  - used by `application-status.html`
  - expected success shape: `{ success: true, data: { status, restaurantName, rejectionReason? } }`

Status values the frontend translates:
`draft, submitted, under_review, pending, more_information_required, approved, rejected`

## Missing / incompatible backend endpoints (do not fake in frontend)

These return 404 or are explicitly blocked. Frontend work on them is paused until backend exists:

- `GET /api/vendor/inventory`
- `PUT /api/vendor/inventory/*`
- `GET /api/vendor/settings`
- `PUT /api/vendor/settings/*`
- `GET /api/vendor/earnings/settlements`
- `GET /api/vendor/withdrawals`
- `POST /api/vendor/support`, `GET /api/vendor/support/tickets`
- `GET /api/vendor/documents`
- `GET /api/vendor/application` (singular app fetch) — only `/vendor-applications` public submit + status exists
- `GET /api/vendor/menu/categories`
- `POST /api/vendor/menu`, `PUT /api/vendor/menu/:id`, `DELETE /api/vendor/menu/:id`
- `GET /api/vendor/dashboard`

Because these do not exist yet, the frontend must not:
- show a menu “add item” flow that calls a non-existent endpoint
- show inventory stock numbers that could disagree with the server
- show a settlement/bank UI backed by fake data
- create a duplicate application by submitting a second POST when the user meant to edit

## Application editing (important gap)

The existing app only has:
- `POST /api/vendor-applications` (create)
- `GET /api/vendor-applications/:id/status`

It does **not** yet have a documented “load existing application + edit + resubmit” endpoint
visible to frontend. So today the frontend cannot safely prefill an existing application,
edit it, and resubmit it on the same ID without backend support or a documented contract.

If the backend later adds a retrieve + edit endpoint, the frontend should use it and keep the
same application ID — not POST a new application as a workaround.

## What this upgrade changed

- `config.js` — cleaned up the host configuration so Render is unambiguous and AWS is not
  referenced as a runtime host. No page changed its API strategy.
- `docs/API.md` — added a single source of truth for the actual Vendor API contract so future frontend/backend work can verify endpoint compatibility without re-reading every page.

Deployable as-is: yes. Changes are confined to `config.js`, plus new documentation.

