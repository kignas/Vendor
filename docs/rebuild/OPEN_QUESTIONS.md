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

## Phase 3 questions

**Q16. Where should HomePage (Overview) live after Orders becomes the home
screen?** Step 1 says "Make `/` redirect to `/orders`… remove it from the nav
(it may be reached from the grid menu as 'Overview')." I kept `HomePage` and
mounted it at a new `/home` route (the root `/` redirects to `/orders`). The
Step 2 grid sheet will link "Overview" to `/home`. *Safest assumption:* a
dedicated `/home` route; confirm the path/label, or say if Overview should be
folded into the header menu without its own route.

**Q17. The Overview (Home) page also renders a `RestaurantStatusControl`.**
Step 2 makes the header pill "the ONE availability control". `HomePage` still
shows the fuller `RestaurantStatusControl` (its top slot when not accepting, a
lower slot otherwise) and `ProfilePage` shows the list variant. *Safest
assumption:* Step 2 only restyles the header; the Home/Profile controls are left
untouched for now. Confirm whether those in-page controls should be removed so
the header is genuinely the only place to change availability.

**Q18. Cutlery field semantics (Step 4 / Step 5 tag).** The legacy app builds the
"Send cutlery" strip from `order.sendCutlery ?? order.cutlery ??
order.cutleryPreference ?? order.cutleryRequired` and shows it when the value is
truthy. For the new "Don't send cutlery, tissues and straws" tag we need the
*opposite* signal — an explicit opt-out — so `cutleryOptOut()` in `orderDomain.ts`
fires only when one of those fields is the boolean `false`, or a
`cutleryPreference` string that reads as a negative ("no", "don't", "without",
"opt out"). `VENDOR-API-CONTRACT.md` does not state the type or the string
vocabulary of `cutleryPreference`. *Safest assumption:* treat an explicit boolean
`false` as the only certain opt-out and also accept an obvious negative string;
when every field is absent or truthy the tag is hidden (never guessed). Confirm
the real field type and allowed values so the string heuristic can be dropped.

**Q19. Info-carousel card copy and the settlement/alert thresholds (Step 6).**
`PHASE-3-ZOMATO-LAYOUT.md` Step 6 lists the card *sources* but not the exact
copy, the "which screen" link targets, or a minimum amount for the settlement
card. *Safest assumptions taken, each of which can be re-worded without code
changes:* (a) alert cards use the server alert *type* only (`out_of_stock`,
`low_stock`, `menu_pending`, `menu_rejected`) and show the **count of matching
alerts** — never a per-item title, so no server text is paraphrased; `order_action`
is deliberately excluded because the new-order bar (Step 4) already owns it;
(b) the settlement card appears only when `availableForWithdrawal > 0` (an active
`activePayoutRequest` gets its own "withdrawal in progress" card); (c) link
targets are the existing routes `/inventory?seg=stock`, `/inventory`,
`/business?seg=finance`, `/profile`; (d) a profile card is emitted only when the
server sends an explicit non-verified `fssaiVerificationStatus` (an absent field
is never shown as "pending"). Confirm the wording and whether the settlement card
should have a minimum amount.

**Q20. Carousel card copy is derived, not server text.** Related to Q19: the
title/body strings in `infoCards.ts` are fixed UI copy around real server
*values* (counts and the `availableForWithdrawal` figure). No number is invented
and no server prose is rewritten. If the product wants the server's own
`alert.title`/`alert.message` rendered verbatim instead of the derived copy, say
so and the builder can switch to those fields.

**Q21. Profile-completion nudge — which field is "missing"? (Step 7.)**
`GET /vendor/profile` selects `name description image address phone email slug
createdAt approvalStatus rejectionReason deliveryMode businessType
fssaiLicenseNumber fssaiVerificationStatus fssaiExpiryDate availability
openingHours isOpen` (see `getVendorProfile`). The nudge therefore keys on
`email`. Two caveats were found while checking the backend:
(a) the `Restaurant` schema has **no `email` field** and the approval flow does
not copy the application's business email onto the restaurant document, so the
selected `email` is likely `undefined` for real vendors. `profileNudgeFor()`
only reports a field as missing when it is **present but blank** (`''` /
whitespace); an absent field means "not returned" and is never shown as
incomplete, so the nudge stays hidden unless the API actually returns a blank
`email`. *Confirm* whether the profile email is populated server-side (e.g. a
virtual/derived field); if it never is, this nudge will never appear and the
copy/field should be revisited.
(b) `email` is not on the vendor `PUT /vendor/restaurant/profile` allow-list, so
"ADD NOW" links to `/profile` where the field can be reviewed but not edited by
the vendor. Confirm where a missing business email is meant to be fixed.

**Q22. Help bubble "Call support" number (Step 7).**
There is **no support-contact endpoint** in `VENDOR-API-CONTRACT.md` and no
support phone anywhere in config, so "Call support" is driven by the optional
build-time env var `VITE_SUPPORT_PHONE` (`lib/supportContact.ts`). It is hidden
unless the value parses as a real phone number (7–15 digits, optional leading
`+`). *Confirm* whether a real support number exists and, if so, provide it (or
the endpoint that returns it); until then the item is hidden rather than showing
a fake number.

**Q23. `busy` availability vs the Orders empty state (Step 8).**
The Orders empty state reads the server's `availability` status. `busy` is
treated as **still accepting orders** — the same reading as `isOutletOpen()`
and the legacy dashboard, and the reason the empty state shows "You are busy —
you are still taking orders" with **no** action, rather than a "paused" claim
with a Resume button. *Confirm* that a `busy` outlet genuinely keeps receiving
new orders server-side. If `busy` actually suppresses new orders, the copy and
the missing Resume action are wrong and should be revisited.

**Q24. Pause reason text (Step 8).**
When the outlet is `temporarily_closed`, the empty state shows the server's
pause reason as the body copy *only if the API actually returns one*; otherwise
it falls back to "New orders are on hold until you resume." No reason field is
invented. *Confirm* which response field carries the vendor-facing pause reason
(if any) so the intended text can be surfaced verbatim.
