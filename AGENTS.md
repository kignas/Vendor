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
- You CANNOT push to GitHub or open PRs. Never run `git push`, `gh`, or try to fix credentials.
  You may commit locally inside the sandbox to track your changes. Delivery is by zip (see Delivery below).
- If something is ambiguous, write the question into `docs/rebuild/OPEN_QUESTIONS.md` and continue
  with the safest assumption. Do not guess backend behaviour.
- Do not add libraries beyond the approved stack below without writing the reason in the PR.

## Delivery (how your work reaches me)
At the START of a phase run `git checkout -b rebuild/phase-N-<name>` and `git tag phase-N-start` (local only).
At the END of a phase, after typecheck/lint/test/build are green:
1. Commit everything locally.
2. Build `delivery/phase-N.zip` containing ONLY files that are new or changed since the tag
   (`git diff --name-only --diff-filter=AM phase-N-start HEAD`), with repo-relative paths, so unzipping at
   the repo root places each file correctly. Include `web/package.json` and `web/package-lock.json` when changed.
   NEVER include node_modules, dist, www, .git, android/build output, .env files, or the delivery folder.
3. Write `delivery/DELIVERY_NOTES.md`: what was built, the list of added/modified files, and shell commands
   for anything deleted or moved (`git rm ...`, `git mv ...`) because a zip cannot delete files.
   Also include the exact commands to run the app and the output of the four checks.
4. Print the zip path and `unzip -l` of it, then stop. Do not start the next phase.

## Approved stack (inside `web/`)
React 18, TypeScript (strict), Vite, React Router (HashRouter), Tailwind CSS v3,
shadcn/ui (Radix primitives), TanStack Query v5, Zustand (small UI state only),
Recharts, Framer Motion, lucide-react, vaul (bottom sheets), sonner (toasts),
Vitest + React Testing Library + MSW, @fontsource/manrope (bundle the font, no Google Fonts CDN;
the app must work offline in the APK shell).

## Design language (Zomato Restaurant Partner style, our own branding)
- Mobile only. One column, max-width 480px, centred. Safe-area padding for notch and gesture bar.
- Calm, high-contrast, mostly monochrome. Colour is used for STATUS only.
- Tokens (reuse the existing ones from theme.css):
  canvas #F4F5F7, card #FFFFFF, ink #18181B, ink-soft #52525B, ink-faint #9CA3AF,
  border #E4E4E7, success #15803D (bg #DCFCE7), warning #B45309 (bg #FEF3C7),
  danger #DC2626 (bg #FEE2E2), info #2563EB (bg #E8F0FE), star #F59E0B.
  Brand crimson #D71945 only for the logo, the new-order alarm and one primary accent per screen.
- Font Manrope. Card radius 16px, button radius 10px, pills fully round.
- 44px minimum tap targets. Bottom sheets instead of modals. Subtle motion (150–250ms), respect reduced-motion.
- Do NOT copy Zomato logos, icons, images or wording. Match layout patterns only.
- Currency formatted with Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).

## Folder layout
web/src/
  app/ (router, providers, layout shell, bottom nav)
  lib/ (api client, caps, auth storage, format helpers, firebase, alarm sound)
  features/ home | orders | menu | inventory | insights | finance | reviews | support | settings | auth | apply
  components/ui/ (shadcn)  components/ (shared: KpiCard, StatusPill, EmptyState, ErrorState, Skeletons, ChartCard)
  test/ (MSW handlers + fixtures)

## Definition of done for any screen
Loading, empty, error and unauthorized states exist; keyboard/screen-reader labels present;
no console errors; tests for the data mapping and the main action; typecheck/lint/test/build all green.
