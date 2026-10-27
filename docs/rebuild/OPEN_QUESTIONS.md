# Open Questions — Phase 0 recon

Per `AGENTS.md`: anything ambiguous is written here and we continue with the
**safest assumption** (no invented endpoint/field/status, no fake numbers).
None of these blocks the recon; they need answers before the relevant Phase
builds.

## Blocking-ish (affects Phase 1/2 scope)

**Q1. The `caps` object has 17 flags; the docs and `contract.test.mjs` pin 10.**
`index.html:1302` defines `menuReorder, serverAlerts, serverActivity,
serverCapacity, serverDashboard, onboardingConfig, policies` in addition to the
10 in `VENDOR-API-CONTRACT.md` / `TEST-REPORT.md`. As a result `npm test` is
currently **44 tests / 43 pass / 1 fail** (`unsupported backend features are
capability-gated`) — this failure pre-exists this branch.
*Safest assumption:* the 17 flags in code are the truth (they are each backed by
a mounted route in `contract.test.mjs`'s allow-list); the prose docs and the
closed-set assertion are stale. **Question:** do we (a) update the docs + test to
17, or (b) freeze the rebuild to the documented 10? The port must know which set
to ship.

**Q2. Six endpoints are called but absent from `VENDOR-API-CONTRACT.md`.**
`GET /vendor/dashboard`, `/vendor/alerts`, `/vendor/activity`,
`/vendor/onboarding/config`, `/vendor/policies`, and `PUT /vendor/menu/reorder`
have no contract table entry. `AGENTS.md` rule 2 says "if it is not in
VENDOR-API-CONTRACT.md, it does not exist", yet the app calls them and the
contract test's allow-list accepts them.
*Safest assumption:* they exist (the allow-list is transcribed from the backend
route table) and will be ported, but the contract doc must be updated first.
**Question:** confirm each is mounted and confirm the response shapes the app
reads (`dashboard.pendingSettlement`, `alerts[].type`, `activity[].message`,
`onboarding.config.maxActiveOrders.{min,max}`, `onboarding.settlementSchedules`,
`policies` version map, `reorder.items[].sortOrder`).

**Q3. `PUT /orders/:id/accept` sends `prepTimeMinutes` as well as `prepMinutes`.**
Only `prepMinutes` is contracted. Is the extra field ignored server-side (keep
it as-is for parity) or removed in the port? *Safest:* port only `prepMinutes`
and note the drop, unless the backend reads `prepTimeMinutes`.

**Q4. The 5-minute accept/reject response window is client-derived.**
`restaurantResponseDeadline` is read but undocumented; the fallback is
`createdAt + 5 min`, after which Accept/Reject are disabled client-side.
**Question:** does the backend enforce a response deadline at all, or is this a
pure UI convention? If the server does not enforce it, disabling Accept/Reject
locally could hide an order the vendor can still legally accept.

**Q5. `order.isFoodReady` and `status === 'ready_for_pickup'` drive the Ready
tab** but are not in the contract's status flow. Which field(s) does the backend
actually send, and is `ready_for_pickup` a real status string?

## Non-blocking (worth an answer)

**Q6. `native-push-vendor.js` — delete at cutover?**
It is the admin bridge (reads `nearbite_admin_token`, routes to
`manage-orders`/`vendor-applications`), is not staged by `scripts/prepare-www.mjs`
and is referenced only by an existence assertion in `contract.test.mjs`. Confirm
it can be dropped from the vendor repo (and that assertion removed) in Phase 7.

**Q7. Which service worker is canonical?**
`index.html` registers `./sw.js` for both the cache worker and FCM; the
`./fcm/`-scope `firebase-messaging-sw.js` is staged but never registered.
Confirm `sw.js` is the single canonical worker and `firebase-messaging-sw.js`
is vestigial.

**Q8. Firebase config placement.** `AGENTS.md` rule 9 wants `VITE_FIREBASE_*`
env or one `src/lib/firebase.ts`, but the values are currently inline in
`index.html`, `sw.js`, `firebase-messaging-sw.js`, `native-push.js`. The
service-worker copies cannot read Vite env at runtime. **Question:** do we keep
a generated worker that inlines the config at build time, or move FCM entirely to
`@capacitor/push-notifications` in the APK and drop the web worker?

**Q9. Native push events have no listener.** `native-push.js` dispatches
`eatswada:push-received` / `eatswada:push-opened`; nothing listens. Should the
ported app subscribe to these to refresh the queue (the safe default), or is the
FCM foreground path the only intended one?

**Q10. `config.js` `ACTIVE_API = 'render'` path is broken.**
`RENDER_API_ORIGIN` is referenced but undefined, so selecting `'render'` blanks
the API base. Keep only the AWS slot in the port, or define both?

**Q11. `USER_KEY` / `RESTAURANT_KEY` are exported but unused as constants.**
Pages hardcode the literals. Keep the literals (rule 6 fixes the key strings) and
drop the unused constants, or centralise on them?

**Q12. Kitchen Rush Mode (`eatswada_vendor_rush_mode`) is a local-only
preference** that adds +5 min to the default KPT. It is not server-backed. Does
it survive the rebuild as a client setting (Zustand + localStorage), or is it
dropped?

**Q13. Payout UI is duplicated.** `openWithdrawSheet`/`submitWithdrawal`
(ledger tab) and `openPayoutSheet`/`submitPayoutRequest` (payouts tab) both POST
`/settlements/withdraw`. Should the port keep both entry points or collapse to
one?

**Q14. Dead symbols to drop:** `reviewStarsHtml`, `state.capabilities`,
`state.orderQueryRequest`, `state.orderQueryResults`, `state.menuOnlineCount`,
`state.pendingRestockWasInStock`, and the whole `caps.complaints`-gated
Complaints console. Confirm removal is acceptable (the contract test references
some of them by name, so the test must be updated in lockstep).

**Q15. `tests/H`** is a stray 1-byte file in `tests/`. Confirm it can be deleted.

## Assumptions already applied in the porting map

- The 17 `caps` flags in code are authoritative until Q1 is answered.
- The six undocumented endpoints are treated as existing (Q2) because they are in
  the contract test's mounted-route allow-list.
- Status strings are rendered raw and never remapped, per `AGENTS.md` rule 3 —
  including `ready_for_pickup` and `otp_verified`, even though only some appear
  in the contract's flow diagram.
