# Eatswada Restaurant Partner — upgrade validation report

Scope: continuation of the existing React + TypeScript + Vite + Capacitor
migration inside `web/`. No backend, production-API, database or Capacitor
`appId` change. This report covers the increments delivered on branch
`upgrade/vendor-partner-2.0` and separates automated, browser and
staging-integration evidence from anything not verified here.

## 1. Git / PR

| Item | Value |
| --- | --- |
| Branch | `upgrade/vendor-partner-2.0` |
| Base | `main` (shallow clone — no merge base; see note below) |
| HEAD | `03ff253` |
| Commits this session | `6282c2b`, `3c87d89`, `04dec5a`, `03ff253` (plus the earlier `1cf7084`…`c1edf18` increment series on the same branch) |
| PR | not opened (branch is pushed/opened by the operator; see §9) |

The clone is shallow (`git rev-parse --is-shallow-repository` → true), so
`main...HEAD` has no merge base and a diff-against-main is not meaningful here.
Per-commit file lists are in §2.

## 2. Added / changed files (this session)

**Changed**
- `web/src/features/restaurant/outletStatus.ts` — added `isOutletOpen`,
  `openingStateOf`, `statusReasonOf` (defensive reason/opening-hours readers).
- `web/src/features/restaurant/RestaurantStatusControl.tsx` — server reason +
  opening-hours advisory + error/retry UI.
- `web/src/features/restaurant/OutletStatusSheet.tsx` — surfaces the reason.
- `web/src/features/restaurant/outletStatus.test.ts` — +8 tests (reason, hours,
  overnight windows).
- `web/src/features/restaurant/RestaurantStatusControl.test.tsx` — +2 tests.
- `web/src/app/AppRouter.tsx` — lazy-load Growth and Design routes.
- `web/vite.config.ts` — vendor chunk splitting.
- `web/src/index.css` — `.safe-x` now additive via `--page-x`.
- `web/src/app/AppShell.tsx`, `web/src/features/apply/{ApplyPage,ApplicationStatusPage}.tsx`,
  `web/src/features/auth/LoginPage.tsx` — set `--page-x`.
- `web/scripts/mock-api.mjs` — real settlements contract, paged reviews.
- `tests/contract.test.mjs` — pin the real 17-flag `caps` set.
- `VENDOR-API-CONTRACT.md` — document the 7 additional capability flags.
- `BACKEND-GAPS.md` — add gaps 9 (analytics metrics) and 10 (availability reason).
- `docs/rebuild/ACCEPTANCE_MIGRATION.md` — correct the root-test result note.

No new files were required beyond the test/report additions.

## 3. Functional screen inventory

| Screen | Route | Data source | State |
| --- | --- | --- | --- |
| Login | `#/login` | `POST /auth/vendor/login` | functional |
| Apply wizard | `#/apply` | `POST /vendor-applications` | functional |
| Application status | `#/application-status` | `GET /vendor-applications/:id/status` | functional |
| Home | `#/` | `/earnings/summary`, `/orders` | functional |
| Orders (queue/history) | `#/orders` | `GET /orders`, `PUT /orders/:id/{accept,reject,ready,status}` | functional |
| Menu | `#/menu` | `GET /menu`, `POST /menu`, `PUT /menu/:id/toggle-stock` | functional (edit/delete gated — §4) |
| Inventory | `#/inventory` | `PUT /menu/:id/inventory`, `toggle-stock` | functional |
| Finance | `#/finance` | `/earnings/summary`, `/earnings/orders`, `/settlements/*` | functional |
| Growth | `#/insights` | `GET /analytics`, `GET /analytics/visits` | functional (subset of metrics — §4) |
| Reviews | `#/reviews` | `GET /reviews`, `POST /reviews/:id/reply` | functional |
| Notifications | `#/notifications` | `GET /notifications`, `PATCH /notifications/:id/read` | functional |
| Support | `#/support` | `/support` | functional |
| Settings | `#/settings` | `GET/PUT /settings`, `/onboarding/config` | functional |
| Profile | `#/profile` | `GET /profile`, `PUT /restaurant/profile` | functional |
| More hub | `#/more` | links | functional |

## 4. Missing backend capabilities

See `BACKEND-GAPS.md` for the full table. Newly documented this session:

- **Growth metrics** not returned by `/vendor/analytics`: previous-period
  comparison, average preparation time, acceptance rate, category performance.
  The screen shows a within-period trend only and omits absent metrics.
- **Availability reason**: no `reason` field; the client reads one only if the
  backend sends it and never invents text.
- Pre-existing: menu edit/delete routes unmounted, vendor complaints, bulk
  restock scheduling, settlement batches, rider-order OTP scope.

## 5. Before / after screenshots

Captured with headless Chromium (CDP) against the mock API, two phone viewports
(360×640 compact, 412×915 large) × two themes × nine screens = **36 PNGs** at
`/tmp/shots/` (`{light,dark}-{compact,large}-{login,home,orders,menu,inventory,finance,growth,reviews,settings}.png`).

"Before" state = the padding bug (§7) and the finance field bug; both are
visible in the pre-fix build and gone after. The screenshots were **captured**
and reviewed through automated DOM/CSS audits (§7) and text extraction, not by
eye; no human visual sign-off is claimed.

## 6. Test counts and build

| Check | Result |
| --- | --- |
| `web/` `tsc -b --noEmit` | clean |
| `web/` `eslint .` | clean |
| `web/` `vitest run` | **184 passed / 184** (28 files) |
| root `npm test` (legacy contract) | **44 passed / 44** (was 43/44 — see §7) |
| `web/` `vite build` | success; no chunk-size warning after code-split |

Baseline comparison: before this session the web suite was 174 tests (one
pre-existing root failure). Added this session: outletStatus +8, status control
+2 → 184. The root failure was fixed by aligning a stale assertion, not by
weakening it (the three unsupported flags stay `false`).

## 7. Defects found and fixed this session

| # | Defect | Severity | Fix |
| --- | --- | --- | --- |
| 1 | `.safe-x` custom utility overrode page `px-4/5/6` (Tailwind emits custom utilities last), so content sat edge-flush and the full-bleed `NewOrderBanner` overflowed the viewport by 16px at **every** width | high (layout) | `.safe-x` takes its base from `--page-x`, additive with the safe-area inset |
| 2 | Root `tests/contract.test.mjs` capability-set assertion pinned 10 flags while legacy `index.html` had 17 (all backed by routes already in the test's allow-list) → 1 failing test on `main` | medium (CI) | pin the real 17; doc updated; unsupported flags still `false` |
| 3 | `mock-api.mjs` used a non-existent `availableBalance` field | low (dev only) | corrected to `availableForWithdrawal` / `activePayoutRequest` |
| 4 | 920 kB single JS chunk | medium (perf) | lazy Growth/Design routes + vendor chunks → 308 kB app + 157 kB React |

**Deferred / blocked:** none newly introduced. Existing documented gaps
(menu edit/delete, complaints) remain blocked by the backend.

## 8. Android verification

Not performed. This environment has **no** `android/` project, no Java, no
Gradle and no Android SDK (`ANDROID_HOME` empty), so no debug APK was built and
no on-device check (startup, back gesture, insets, sound/haptics, notifications,
keyboard) was run. Per the task's honesty rule this is reported as **not
verified** rather than assumed. The web-layer back-button policy, safe-area
padding and status-bar theming are implemented and unit-tested
(`backNavigation.test.ts`) but their native behaviour is unverified here.

## 9. Validation honesty split

- **Automated:** typecheck, lint, 184 web tests, 44 root contract tests, build —
  all run here and green.
- **Browser:** CDP audits over the built app + mock API — horizontal-overflow
  audit at 320/360/412px (clean after fix), dark-mode luminance audit (only
  intentional inverted elements flagged), text-clipping audit (none), and
  `innerText` extraction confirming real content on every screen.
- **Staging integration:** not run this session (mock API used; shapes mirror
  `VENDOR-API-CONTRACT.md`).
- **Physical device:** not run (no toolchain).

## 10. Rollback procedure

1. `git switch upgrade/vendor-partner-2.0` and `git revert` the four commits
   `03ff253 04dec5a 3c87d89 6282c2b` (or `git reset --hard <pre-session-sha>`
   on this branch only — never on `main`).
2. `cd web && npm ci && npm run build` to restore the previous bundle.
3. No backend, database, Capacitor config or production-API change was made, so
   no server-side rollback is required.
