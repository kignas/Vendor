# PHASE 3: Orders-first layout and flow (Zomato Restaurant Partner style)

Read `AGENTS.md` first. Every hard rule there still applies (no invented
endpoints/fields/statuses/numbers, `caps`, single-flight mutations, 401 handling,
localStorage auth keys unchanged, do not touch the files listed in rule 10).
This phase changes **layout, navigation and styling**. Business logic that
already exists (acceptance window, prep stepper, KOT, rider status, bill
breakdown, alarm, history pagination) is REUSED, not rewritten.

Work in the numbered steps below, ONE step at a time. After each step run
`npm run typecheck && npm run lint && npm test && npm run build` inside `web/`,
fix failures, update affected tests, commit, then move on. If a field or
behaviour is unclear, write the question to `docs/rebuild/OPEN_QUESTIONS.md`
and use the safest assumption (hide the element).

Do NOT copy Zomato logos, icons, illustrations, names or marketing copy. Match
layout patterns only. Draw our own inline-SVG illustrations.

---

## Target experience (what the reference app does)

1. **Orders is the home screen.** There is no separate "Home/Overview" tab.
2. Header: Online switch (left), then bell, search, and a grid icon (right).
3. Under the header: three outlined chips with counts: Preparing (n), Ready (n),
   Picked up (n). Counts show even when 0. Active chip has a crimson outline.
4. A dismissible, swipeable info-card carousel with dots sits above the list.
5. The list is flat: full-width white sections separated by a thick grey band,
   NOT floating rounded cards.
6. New orders do not live in a tab. A green bar fixed above the bottom nav says
   "You have N new order" with a chevron-up; tapping it opens the new-order sheet.
7. Bottom nav (5): Orders, Inventory, Business, Feedback, History.
8. Empty state: illustration + "You are online / Waiting for new orders".
9. A small green floating help bubble on the right edge.

---

## Step 1: Navigation and routes

- Make `/` redirect to `/orders`. Keep `HomePage` file and tests but remove it
  from the nav (it may be reached from the grid menu as "Overview").
- New `BottomNav` items (labels and routes):
  - Orders `/orders` (keep the new-order badge)
  - Inventory `/inventory`: a segmented control at the top, "Menu | Stock",
    rendering the existing `MenuPage` and `InventoryPage` bodies
  - Business `/business`: segmented "Insights | Finance", rendering the
    existing `InsightsPage` and `FinancePage` bodies. Old `/insights` and
    `/finance` routes redirect here with the right segment.
  - Feedback `/reviews` (existing ReviewsPage)
  - History `/history`: the existing order-history list (`useOrderHistory`,
    "Load older orders", "Showing N of M") as its own screen
- Highlight the active item with brand colour on icon and label. Keep 44px+ tap
  targets and safe-area padding.
- Update `BottomNav`, router and navigation tests.

## Step 2: Header

Replace the current `TopBar` content with:
- Left: an **Online switch** pill (green with "Online" when accepting orders;
  neutral grey with "Offline" or amber "Busy/Paused" otherwise). It is the ONE
  availability control. Turning it ON calls the existing availability action
  through `RestaurantStatusControl` logic. Turning it OFF (or tapping when
  paused) opens the existing `OutletStatusSheet` to choose how long. Use the
  existing real `PUT /restaurant/availability` path only.
- Right: bell (with unread badge, existing logic), search icon (opens an
  order-search input over the list; reuse the Orders search logic), grid icon
  (opens a bottom sheet "Menu" listing: Overview, Restaurant profile,
  Notifications, Support, Settings, Sign out; restaurant name shown as the
  sheet title).
- No-internet message stays, shown as a thin bar under the header.
- Header is white (dark surface in dark mode), no heavy border, sticky.

## Step 3: Orders page structure

- Replace the tab bar with three outlined chips: **Preparing**, **Ready**,
  **Picked up**, each with `(count)`. Map them to the EXISTING order groups
  (`preparing`, `ready`, `dispatch`). Only the chip LABEL changes; never rename
  or remap server status strings (rule 3). Default chip = Preparing.
- Scheduled orders: show a fourth chip "Scheduled (n)" ONLY when n > 0.
- Remove the `new` and `history` tabs from this page. History moved in Step 1.
- Render the list as flat full-width sections: white background, 16px padding,
  an 8px canvas-coloured gap between orders, no card radius or shadow.
- Keep the loading skeleton, error + Retry, and real empty states.

## Step 4: New-order bar and sheet

- When there are orders in `placed` status, show a fixed green bar above the
  bottom nav: chevron-up icon and "You have N new order(s)". Tapping it (or
  swiping up) silences the alarm and opens the new-order sheet. Keep the
  existing alarm/vibration and acceptance-window expiry refresh from
  `NewOrderBanner`; this is a restyle of that component, not a rewrite.
- Restyle `AcceptOrderSheet` to match the reference:
  - Green header band: "N new order" and an X on the right.
  - Row: `ID: 1234` with a copy icon (copies the order reference), time on the right.
  - "1st order by {name}" line using the existing `loyaltySubtitle` data. Show
    it only when the data exists.
  - Red-outlined tag "Don't send cutlery, tissues and straws" ONLY when the
    existing cutlery fields (`sendCutlery`, `cutlery`, `cutleryPreference`,
    `cutleryRequired` in `types/order.ts`) clearly say no cutlery. Read
    `orderDomain.ts` and confirm the semantics first; if unclear, hide the tag
    and log an open question.
  - Item rows: diet mark, `qty x name`, price on the right.
  - "Total Bill" with a PAID/COD chip (from `paymentModeOf`) and an expandable
    chevron showing the existing `billRows`.
  - A green "VEG ONLY ORDER" line ONLY when every item reports `diet === 'veg'`.
  - "Set food preparation time": a bordered segmented stepper `[-]  17 mins  [+]`
    using the existing `prepTime.ts` constants and `clampPrepMinutes`.
  - Footer: **Reject** (red outline, left, smaller) and **Accept (mm:ss)**
    (green, right, wider) with a progress fill that drains with the acceptance
    window. Show the countdown only when the server supplied a deadline.
  - If several orders are waiting, show "1 of N" and let the vendor swipe or tap
    between them.
- Accept and Reject stay single-flight. If the refetch shows the order is no
  longer `placed` (accepted elsewhere), show a dark toast "Order already
  accepted"; otherwise show the real error message.

## Step 5: Order card (Preparing / Ready / Picked up)

Rebuild `OrderCard` as a flat section. Reuse existing helpers; remove the coloured
left edge.
1. Row 1: `ID: 7500` + copy icon on the left; time on the right; kebab (3-dot)
   menu with: Print KOT, Read aloud, Extend prep (+5 min, existing one-time
   rule), Get help (opens `OrderSupportSheet`). Move those actions out of the
   card body into this menu.
2. Row 2: filled status badge (uppercase, tinted: PREPARING, READY, etc. using the
   server status text rendered raw) and "1st order by {name}" in teal/info text.
3. Cutlery tag as in Step 4 (same rule).
4. Items: diet mark, `qty x name`, price right. Tapping an item name (dashed
   underline) opens a small bottom sheet with its customizations, add-ons and
   notes ONLY if the order data has them.
5. "Total Bill [PAID]" row with expandable bill breakdown (existing `billRows`,
   commission shown only if `caps.billBreakdown`).
6. "VEG ONLY ORDER" line, same rule as Step 4.
7. Rider box: a bordered row with a scooter icon and the text from the existing
   `RiderStatus` logic. Show it ONLY with real server data. Never invent counts
   like "5 riders nearby".
8. Primary button: full-width, 52px, **filled blue** "Order ready (mm:ss)" with
   the existing prep-deadline countdown and split-fill. After ready: "Hand over
   to rider" style actions use the existing advance/OTP logic with the same
   button style (blue for forward actions).
9. Keep `UndoReadyToast`, `SuccessFlash`, self-delivery OTP gating and rider
   status components working.

## Step 6: Info-card carousel (real data only)

Create `InfoCarousel` above the order list: horizontally scrollable, snap
scrolling, dots indicator, an X to dismiss each card.
- Cards come ONLY from real data: server alerts (`/alerts`, caps.serverAlerts:
  out of stock, low stock, menu awaiting review), withdrawable balance / pending
  settlement (`/settlements/summary`, caps.settlements), and policy or profile
  items from the existing policies/profile endpoints. Each card has a title, one
  line of text, and a white button linking to the right screen.
- No marketing, ads, partner promos, or invented tips.
- Dismissals persist in localStorage under the NEW key
  `eatswada_vendor_dismissed_cards` (a map of card id to dismissed-at date);
  a dismissed card reappears the next day only if its underlying alert still exists.
- Hide the whole carousel when there are no cards.

## Step 7: Profile-completion nudge and help bubble

- `ProfileNudge`: a thin bar above the bottom nav (below the new-order bar if
  both show) such as "Missing email address, Don't miss important updates" with a
  blue "ADD NOW" action linking to `/profile`. Show it only when the profile data
  from `GET /vendor/profile` or `GET /restaurant` is genuinely missing a field
  (check which fields the contract returns; start with email). Dismissible for
  the session.
- `HelpBubble`: a 48px green circle with a "more" or "help" icon fixed on the
  right edge above the bottom nav, opening a small sheet: Support tickets,
  Call support (only if a real number exists in config), Notifications. Hide it
  while any sheet is open.

## Step 8: Empty states with our own illustration

- Create an inline-SVG storefront illustration (own design: awning, door with an
  OPEN sign, small plants, soft colours, works in dark mode).
- Orders empty state copy:
  - Accepting: "You are online" / "Waiting for new orders"
  - Offline: "You are offline" / "Turn on Online to receive orders" + a button
    that turns Online
  - Paused/Busy: "Orders are paused" / state reason + "Resume orders" button
- Use similar illustration + copy for empty Ready, Picked up and History.

## Step 9: Visual polish

- Tokens stay as in `AGENTS.md`/`theme.css`. Add only what is missing:
  - Forward action blue = `info` (#2563EB); accept green = `success`;
    reject = danger outline; active chip = brand crimson outline.
  - Section gap band uses `canvas`.
- Typography: Manrope, order ID 16px bold, price 15px semibold with tabular
  numbers, secondary text 13px `ink-soft`.
- Toasts: dark rounded pill with a leading icon (sonner), bottom-centred above
  the nav.
- Motion 150 to 250ms; respect `prefers-reduced-motion`.
- Verify light AND dark mode on every changed screen.

## Step 10: Docs and cleanup

- Update the "Design language" and "Folder layout" parts of `AGENTS.md` to the
  new navigation (Orders, Inventory, Business, Feedback, History).
- Update `DesignPage.tsx` gallery with the new components in every state.
- Add tests: nav items and redirects, chip counts, new-order bar visibility,
  sheet rendering rules (cutlery tag, veg-only, prep stepper bounds), carousel
  dismiss persistence, nudge visibility only when a field is missing.
- Record anything you could not verify in `docs/rebuild/OPEN_QUESTIONS.md`.

## Definition of done

Every changed screen has loading, empty, error and unauthorized states, works in
light and dark, has no console errors, shows no number the backend did not send,
and `typecheck`, `lint`, `test`, `build` are all green.
