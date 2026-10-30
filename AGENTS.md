# Eatswada Vendor (Restaurant Partner) App

## What this repo is
Restaurant partner app for Eatswada. Currently plain HTML/JS (index.html, login.html,
apply.html, application-status.html, theme.css, config.js) wrapped by Capacitor 8.5.2
into an Android APK (appId com.eatswada.vendor). We are rebuilding the UI in
React + TypeScript + Vite inside the `web/` folder. The old files stay in place until cutover.

## Hard rules (never break these)
1. NEVER modify the backend. It is a separate repo. Only call the endpoints listed in
   VENDOR-API-CONTRACT.md.
2. NEVER invent an endpoint, response field, order status or a "saved" success message.
   If something is not in VENDOR-API-CONTRACT.md, it does not exist.
3. Order status strings come from the server and are rendered raw. Never rename or remap them.
4. Features the backend does not support stay OFF via a frozen `caps` object (see BACKEND-GAPS.md).
   caps false => send no request and show no number. No URL or runtime override of caps.
5. No fake or placeholder numbers in production UI. Loading = skeleton. Empty = real empty state.
   Error = message + Retry button.
6. Keep localStorage keys exactly: `nearbite_vendor_token`, `nearbite_vendor_user`,
   `nearbite_vendor_restaurant`. Existing logged-in vendors must stay logged in after cutover.
7. Every mutation is single-flight (a double tap must not send two requests).
8. HTTP 401 on any call => clear token, go to login.
9. Do not commit secrets. API origin comes from env (`VITE_API_ORIGIN`, default https://api.eatswada.com).
   Firebase web config goes in env (`VITE_FIREBASE_*`) or one `src/lib/firebase.ts`.
10. Do not touch: `android-icons/`, `.github/workflows/build-android.yml` (until Phase 7),
    `scripts/add-fullscreen-alert.mjs`, `scripts/configure-firebase-gradle.mjs`,
    `capacitor.config.json` appId. Do not delete old HTML files before Phase 7.

## Working style
- Read big files by line range or grep. Never print all of index.html.
- Work in small steps. After EACH step run: `npm run typecheck && npm run lint && npm test && npm run build` (inside `web/`).
  Do not continue while any of these fail.
- Commit after every working step with a clear message. Never force-push.
- If something is ambiguous, write the question into `docs/rebuild/OPEN_QUESTIONS.md` and continue
  with the safest assumption. Do not guess backend behaviour.
- Do not add libraries beyond the approved stack below without writing the reason in the PR.

## Approved stack (inside `web/`)
React 18, TypeScript (strict), Vite, React Router (HashRouter), Tailwind CSS v3,
shadcn/ui (Radix primitives), TanStack Query v5, Zustand (small UI state only),
Recharts, Framer Motion, lucide-react, vaul (bottom sheets), sonner (toasts),
Vitest + React Testing Library + MSW, @fontsource/manrope (bundle the font, no Google Fonts CDN;
the app must work offline in the APK shell).

## Navigation (Phase 3)
Orders is the landing screen (`/` redirects to `/orders`). The bottom nav has exactly
five destinations, in this order: **Orders · Inventory · Business · Feedback · History**.
- `/orders` — the live queue and the acceptance flow (the home screen).
- `/inventory` — a hub with a Menu | Stock segmented control (old `/menu` deep-links here).
- `/business` — a hub with an Insights | Finance segmented control (old `/insights` and
  `/finance` redirect here, the latter with `?seg=finance`).
- `/feedback` is Feedback (the `/reviews` route). `/history` is past orders.
HomePage is NOT a nav destination; it is reachable from the header grid menu as "Overview"
(`/home`) and must not be deleted. Profile, Notifications, Support and Settings live in the
header grid sheet; Login/Apply are public routes.

## Design language (Zomato Restaurant Partner style, our own branding)
- Mobile only. One column, max-width 480px, centred. Safe-area padding for notch and gesture bar.
- Calm, high-contrast, mostly monochrome. Colour is used for STATUS and MEANING only.
- Tokens (reuse the existing ones from theme.css):
  canvas #F4F5F7, card #FFFFFF, ink #18181B, ink-soft #52525B, ink-faint #9CA3AF,
  border #E4E4E7, success #15803D (bg #DCFCE7), warning #B45309 (bg #FEF3C7),
  danger #DC2626 (bg #FEE2E2), info #2563EB (bg #E8F0FE), star #F59E0B.
  Brand crimson #D71945 only for the logo, the new-order alarm and one primary accent per screen.
- Colour roles (Phase 3): **forward actions are info blue** (#2563EB, e.g. "Order ready"),
  **accept is success green**, **reject is a danger outline**, and the **active chip is a brand
  crimson outline**. One primary accent per screen; everything else stays neutral.
- Typography: Manrope. Order ID 16px bold; price 15px semibold with tabular numbers; secondary
  text 13px in `ink-soft` (never `ink-faint` for readable text). Card radius 16px, button radius
  10px, pills fully round.
- 44px minimum tap targets. Bottom sheets instead of modals. Subtle motion (150–250ms), respect reduced-motion.
- Toasts: dark rounded pill with a leading icon (sonner), bottom-centred above the nav.
- Do NOT copy Zomato logos, icons, images or wording. Match layout patterns only.
- Currency formatted with Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).

## Folder layout
web/src/
  app/ (router, providers, layout shell, bottom nav, header grid sheet, bottom-stack geometry,
        toaster, overlay/back-navigation)
  lib/ (api client, caps, auth storage, format helpers, firebase, alarm sound, support contact)
  features/ home | orders | menu | inventory | insights | finance | reviews | support | settings | auth | apply
  components/ui/ (shadcn: button, input)
  components/ (shared: KpiCard, StatusPill, EmptyState, ErrorState, Skeletons, ChartCard,
              StorefrontIllustration, DietMark, SegmentedControl, ScrollTabs, Sheet, BottomSheet)
  services/ (api/* endpoint modules, notifications/alarm + notifications/push)
  hooks/ (TanStack Query wrappers + device hooks)
  types/ (server payload types)  test/ (MSW handlers + fixtures)

### New components from Phase 3
- `features/orders/NewOrderBanner` — the fixed green new-order bar above the bottom nav
  (chevron-up + "You have N new order(s)"). Tap or swipe up opens the accept sheet and silences
  the alarm; it also refreshes the queue when an acceptance window lapses.
- `features/orders/AcceptOrderSheet` — the accept/reject sheet (green header band, ID + copy,
  item rows, Total Bill with a PAID/COD chip and expandable breakdown, prep-time stepper,
  Reject | Accept footer with a draining countdown fill).
- `features/orders/InfoCarousel` — the real-data-only info cards above the order list.
- `features/restaurant/ProfileNudge` — the profile-completion bar above the nav.
- `features/support/HelpBubble` — the floating help button that opens the support sheet.
- `components/StorefrontIllustration` — our own empty-state illustration (never a copied asset).

### New localStorage key (Phase 3)
- `eatswada_vendor_dismissed_cards` — the info-carousel dismissal map (card id → ISO timestamp;
  a card stays hidden only for the current local day). The three auth keys below are unchanged.

## Definition of done for any screen
Loading, empty, error and unauthorized states exist; keyboard/screen-reader labels present;
no console errors; tests for the data mapping and the main action; typecheck/lint/test/build all green.
