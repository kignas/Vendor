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
- `POST /api/vendor-applications` — create **or update** an application
  - used by `apply.html` (new application *and* correction/resubmission)
  - **Create**: POST without `id` → new application + vendor account.
  - **Update/resubmit**: POST **with the existing `data.id` in the body** → the backend
    updates that same application in place (same `id`, same `createdAt`, no duplicate)
    and resets `status` to `pending`. VERIFIED against the Render testing API on 2026-10-03.
  - Required body fields (backend-enforced, verified): `ownerName`, `email`, `phone`,
    `password`, `restaurantName`, `businessType` (`restaurant` | `cloud_kitchen`),
    `cuisine`, `address`, `fssaiLicenseNumber`, `deliveryMode` (`self_delivery` |
    `eatswada_rider`), `openingHours`, `location` (`{ type:'Point', coordinates:[lng,lat] }`).
  - Success shape: `{ success: true, message, data: { id, status, restaurantName, ownerName,
    businessType, deliveryMode, createdAt, reviewedAt, rejectionReason, changeRequest, statusToken } }`
  - **`statusToken` is rotated on every successful submit** — clients must persist the
    newest token or the status endpoint stops resolving the application.
- `GET /api/vendor-applications/:id/status?statusToken=...` — check status
  - used by `application-status.html`
  - returns the same field set as above **including `changeRequest`** (the admin's
    change-request message) and `rejectionReason`.
  - missing/wrong token → `{"success":false,"message":"Invalid application status request."}`

Status values returned by the backend:
`pending, under_review, more_information_required, approved, rejected` (the frontend also
renders `draft`/`submitted` defensively).

### Applicant identity persistence

`apply.html` and `application-status.html` store the application `id` + `statusToken` in
`sessionStorage` and `localStorage` (keys `eatswada_vendor_application_id`,
`eatswada_vendor_application_status_token`). This lets the same browser continue an existing
application instead of creating a duplicate. The password is **never** stored.

The last submitted (non-password) form values are cached under
`eatswada_vendor_application_draft` so the correction form can prefill them.

## Missing / incompatible backend endpoints (do not fake in frontend)

Confirmed `404 Route not found` (frontend work stays paused until the backend exists):

- `GET /api/vendor/inventory`, `PUT /api/vendor/inventory/*`
- `GET /api/vendor/earnings/settlements`
- `GET /api/vendor/withdrawals`
- `POST /api/vendor/support`, `GET /api/vendor/support/tickets`
- `GET /api/vendor/documents`
- `GET /api/vendor/menu/categories`
- `PUT/PATCH/DELETE /api/vendor-applications/:id`, `.../resubmit`, `.../edit`

Now present but auth-gated — **existence confirmed, contract not yet verified** (they answer `401
Not authorised — no token provided` instead of `404`). Do not build UI on them until a real
vendor token can exercise them:

- `GET /api/vendor/dashboard`
- `GET /api/vendor/settings`, `PUT /api/vendor/settings/*`
- `POST /api/vendor/menu`, `PUT /api/vendor/menu/:id`
- `GET /api/vendor-applications/:id`, `GET /api/vendor-applications/mine`

Because these do not exist yet, the frontend must not:
- show a menu “add item” flow that calls a non-existent endpoint
- show inventory stock numbers that could disagree with the server
- show a settlement/bank UI backed by fake data
- create a duplicate application by submitting a second POST when the user meant to edit

## Application editing / resubmission (contract now verified)

There is **no** `PUT/PATCH/DELETE /api/vendor-applications/:id` and no `/resubmit` or `/edit`
sub-route (all return `404 Route not found`). Resubmission is done by re-POSTing to the
collection endpoint with the existing `id` in the body:

```
POST /api/vendor-applications   { id: "<existing application id>", ownerName, ... }
                                → same application updated, status reset to `pending`,
                                  new `statusToken` issued
```

Verified live on 2026-10-03: the response returned the same `id` and `createdAt` with the
edited fields, proving an in-place update rather than a duplicate.

### Retrieving an existing application's full data

- `GET /api/vendor-applications/:id` and `GET /api/vendor-applications/mine` exist but are
  auth-gated (`401` without a vendor token). Vendor login is blocked until the application is
  approved (`"Your account has been disabled."`), so a pre-approval applicant cannot read
  their full application back from the API.
- Consequence: the correction form prefills from (a) the locally cached draft
  (`eatswada_vendor_application_draft`) and (b) the fields the status endpoint does return
  (`ownerName`, `restaurantName`, `businessType`, `deliveryMode`). Everything else the
  applicant re-enters. A cross-device correction starts with a blank form but still updates
  the **same** application id (no duplicate).
- The password must be re-entered on resubmission; it is required by the create/update
  contract and is never stored client-side.

### Not collected (by product rule)

Business PAN, GST, bank/settlement details, commission, minimum order value, delivery fee,
free-delivery threshold, FSSAI certificate uploads and identity-document uploads are **not**
part of the application. There is no backend field for them and the form does not send them.

## What this upgrade changed (Vendor 2.0 audit pass)

- `config.js` — **fixed a fatal bug**: the previous version referenced undefined variables
  (`API_BASE`, `AUTH_BASE`, `APPLICATIONS_BASE`, `NOTIFICATIONS_BASE`, `CONFIG`) and threw a
  `ReferenceError` on every page load, which broke all API access. The derived bases are now
  computed from `API` and the token/poll keys are defined. Dead "application routing" code that
  advertised non-existent routes (`/applications`, `/:id/edit`) was removed.
- `apply.html` — repaired the inline script (it had a syntax error, a duplicated submit block
  and an undefined `statusKey` that crashed after a successful submit). Added the required
  `businessType` and `deliveryMode` fields, removed all prohibited/unsupported fields, and
  implemented the edit/resubmit flow.
- `application-status.html` — repaired a corrupted stylesheet (literal `\n` sequences),
  surfaced the admin `changeRequest` message, persisted applicant identity, and added the
  **Edit & resubmit** action.
- `login.html` — repaired the same stylesheet corruption so the green theme actually applies.
- `index.html` — dispatch tab now includes `waiting_for_rider`/`assigned` orders, and order
  ticket rendering tolerates a missing `items` array.

Deployable as-is: yes. Render is the only active API host.

