# DECISIONS.md

Product decisions taken where the brief was ambiguous. Each entry states the
safest rule chosen and why. Newest work at the bottom.

## A. Online / Offline switch

1. **"Offline" maps to the existing availability status, not a new field.**
   The backend already persists `restaurant.availability` and gates new-order
   creation on it (`updateVendorAvailability`, allowed values include
   `temporarily_closed`). The switch sends `PUT /vendor/restaurant/availability`
   with `{ status: 'temporarily_closed' }` / `{ status: 'open' }`. No new
   endpoint or field was invented.

2. **"Online" is defined as `isOutletOpen(status)`** — the same predicate the
   outlet-status sheet already uses, so the switch and the status pill can never
   disagree. Any non-open status (temporarily closed, closed today) reads as
   "Offline".

3. **Going offline asks for confirmation; going online does not.** Rationale:
   pausing orders is the destructive direction (customers see the outlet as
   closed). Resuming is safe and reversible. The confirm copy is exactly
   "Stop receiving new orders?" as specified.

4. **Existing orders are never touched.** The switch only writes availability;
   it sends no request against New/Preparing/Ready orders, matching the brief
   ("existing orders continue normally"). The Orders banner states this.

5. **The change is single-flight and server-authoritative.** A second tap while
   a request is in flight is ignored; the switch renders the server's
   `availability` and rolls back automatically if the backend rejects the write
   (e.g. a vendor who does not own the restaurant), so the UI never shows a
   state the server did not accept.

6. **Network-online vs restaurant-online are distinct.** The header keeps the
   pre-existing network indicator (`connection`), now collapsed to an icon under
   360px so the new switch, name and bell do not overlap on small phones. The
   switch reflects the RESTAURANT's order-accepting state, not connectivity.

## B. Analytics page redesign

7. **One aggregated endpoint, with an honest fallback.** The page prefers
   `GET /vendor/analytics/overview?period=` (spec in
   `docs/rebuild/ANALYTICS_BACKEND.md`). The backend repo is out of scope
   (AGENTS.md rule 1), so while it is undeployed the service falls back to
   composing `GET /vendor/analytics` + `GET /vendor/analytics/visits`. The
   fallback fills ONLY the blocks those endpoints provide; comparison deltas,
   payment/diet mix, worst sellers and peak hours stay hidden — never faked.

8. **Periods are Today / 7 days / 30 days**, as specified. `90d`/`all` remain
   valid in the shared period type (the legacy endpoint still accepts them) but
   are not offered as chips. "Today" is sent as `period=today`; the backend spec
   maps it to a 1-day window and a 1-day comparison window.

9. **Missing metrics render as an em dash, never a zero.** A metric the server
   did not send is `null` → `—`. This required a local `optNum` because
   `Number(null) === 0` would silently fabricate a real zero (rule 5).

10. **No percentage without a valid baseline.** `percentChange` returns `null`
    when the previous value is missing or zero (no `Infinity`/`NaN`). The
    cancellation-rate tile compares rate-vs-rate, not count-vs-count, so its
    delta is meaningful.

11. **Charts are hand-rolled inline SVG** (`src/components/charts/`). No chart
    library and no paid service. Geometry lives in pure, unit-tested functions
    (`donutSegments`, `sparklinePath`) so it can be verified without a DOM. The
    pre-existing Recharts dependency is left installed and untouched for the
    design-system page; the Analytics page no longer imports it.

12. **Colours follow our dark palette, not the reference's light blue.** The
    layout, card style and chart TYPES mirror the reference; brand red
    (`#D71945` / `--es-brand-ink`) is the accent. The "Orders" bar card uses a
    subtle brand gradient.

13. **Menu views / unique visitors = 0 is a real zero.** The collection is empty
    because no client emits the public visit beacon. This is NOT fixable from
    the vendor app; the fix is a `menu_view` beacon on the customer app
    (spec in `docs/rebuild/ANALYTICS_BACKEND.md` §5). The honest note is shown
    while `totalViews === 0` and disappears automatically once real views
    arrive — no code change needed then.

14. **Accessibility.** Each chart is a labelled `role="img"`; the sales-trend
    points are real buttons (keyboard-focusable, `aria-pressed`) and the tooltip
    is `role="tooltip"`. Tap targets meet the 44px minimum via `min-h-tap`.
