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
