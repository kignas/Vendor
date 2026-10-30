# Aggregated analytics endpoint — backend patch spec

The redesigned Analytics page reads ONE aggregated endpoint. This file is the
exact change to apply in the **backend repo** (`kignas/Eatswada-`). Per
AGENTS.md rule 1 the vendor app never modifies the backend, so this is a spec,
not an applied patch. Until it ships the app transparently falls back to
composing `GET /vendor/analytics` + `GET /vendor/analytics/visits`
(`src/services/api/analytics.ts` → `fetchAnalyticsOverview`); the comparison
and mix charts simply stay hidden rather than showing a made-up number.

## 1. Route

`routes/vendorRoutes.js` (next to the existing analytics routes):

```js
router.get('/analytics/overview', protect, role('vendor'), getVendorAnalyticsOverview);
```

Mount it BEFORE `router.get('/analytics', …)` only if using a bare `'/analytics'`
path; with the `/overview` suffix ordering does not matter.

## 2. Index

The aggregation filters `{ restaurant, createdAt: { $gte, $lt } }` and groups by
day. Add the compound index (the model already has `{ restaurant, status, createdAt }`;
this one serves the pure time-window scan):

```js
// models/Order.js
orderSchema.index({ restaurant: 1, createdAt: -1 });
```

## 3. Controller

```js
// controllers/vendorController.js
exports.getVendorAnalyticsOverview = asyncHandler(async (req, res) => {
  if (!assertVendorPayload(req, res)) return;

  const PERIOD_DAYS = { today: 1, '7d': 7, '30d': 30 };
  const period = Object.prototype.hasOwnProperty.call(PERIOD_DAYS, req.query.period)
    ? req.query.period
    : '7d';
  const days = PERIOD_DAYS[period];

  const restaurant = new mongoose.Types.ObjectId(String(req.user.restaurantId));
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);
  const prevStart = new Date(now.getTime() - days * 2 * 86400000);

  const baseMatch = { restaurant };

  // Current and previous windows share every stage except the date range.
  const summarise = (from, to) => ([
    { $match: { ...baseMatch, createdAt: { $gte: from, $lt: to } } },
    { $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        sales: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, { $ifNull: ['$subtotal', 0] }, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
    } },
  ]);

  const [curRows, prevRows, daily, paymentMix, dietMix, items, peakHours] = await Promise.all([
    Order.aggregate(summarise(start, now)),
    Order.aggregate(summarise(prevStart, start)),
    Order.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: start, $lt: now } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          orders: { $sum: 1 },
          sales: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, { $ifNull: ['$subtotal', 0] }, 0] } },
      } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: start, $lt: now } } },
      { $group: { _id: '$paymentMethod', orders: { $sum: 1 }, amount: { $sum: { $ifNull: ['$total', 0] } } } },
    ]),
    Order.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: start, $lt: now } } },
      { $unwind: '$items' },
      { $group: {
          _id: { $cond: [{ $eq: ['$items.isVeg', false] }, 'non_veg', 'veg'] },
          orders: { $sum: { $ifNull: ['$items.quantity', 0] } },
      } },
    ]),
    Order.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: start, $lt: now } } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.name',
          quantity: { $sum: { $ifNull: ['$items.quantity', 0] } },
          sales: { $sum: { $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 0] }] } },
      } },
      { $sort: { quantity: -1 } },
    ]),
    Order.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: start, $lt: now } } },
      { $group: {
          _id: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
          orders: { $sum: 1 },
      } },
      { $sort: { orders: -1 } },
    ]),
  ]);

  const money = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
  const summariseRows = (rows) => {
    const r = rows[0] || {};
    const delivered = Number(r.deliveredOrders || 0);
    const totalOrders = Number(r.totalOrders || 0);
    return {
      totalOrders,
      sales: money(r.sales),
      cancelledOrders: Number(r.cancelledOrders || 0),
      averageOrderValue: totalOrders ? money(r.sales / totalOrders) : 0,
    };
  };

  res.json({ success: true, data: {
    period,
    current: summariseRows(curRows),
    previous: summariseRows(prevRows),
    daily: daily.map((d) => ({ date: d._id, orders: d.orders, sales: money(d.sales) })),
    paymentMix: paymentMix.map((p) => ({ method: p._id, orders: p.orders, amount: money(p.amount) })),
    dietMix: dietMix.map((d) => ({ type: d._id, orders: d.orders })),
    topItems: items.slice(0, 5).map((i) => ({ name: i._id, quantity: i.quantity, sales: money(i.sales), spark: i.spark || [] })),
    worstItems: items.slice(-5).reverse().map((i) => ({ name: i._id, quantity: i.quantity, sales: money(i.sales) })),
    peakHours: peakHours.map((h) => ({ hour: h._id, orders: h.orders })),
    visits: await visitSummaryFor(restaurant, start, now), // reuse services/analyticsService.js
  }});
});
```

## 4. Notes

- **Ownership**: `req.user.restaurantId` is the only restaurant ever matched, so
  a vendor can never read another restaurant's data (same pattern as the
  existing `getVendorAnalytics`).
- **Validation**: the `period` param is whitelisted; anything else falls back to
  `7d`. No user input reaches the pipeline as a raw value.
- **Cheap for ~20–30 concurrent users**: four indexed `$match` scans plus a
  handful of group stages; no `$lookup`, no unbounded `$sort` on the collection.
  `topItems`/`worstItems` are sliced in the controller, not in Mongo.
- **`spark`**: to keep it cheap, either omit it (the UI hides the sparkline) or
  add a small per-day group per item in a follow-up. The UI tolerates both.

## 5. Customer-app visit event (Menu views = 0)

`GET /vendor/analytics/visits` is empty because nothing emits the public beacon
`POST /api/analytics/visit` (`controllers/analyticsController.js` → `trackVisit`).
The customer app must fire, once per restaurant page open:

```js
navigator.sendBeacon(
  `${API_ORIGIN}/api/analytics/visit`,
  new Blob([JSON.stringify({ eventType: 'menu_view', restaurantId })], { type: 'application/json' }),
);
```

`recordVisit` is idempotent per actor/day, so a refresh loop still counts once.
Until this ships the vendor Analytics page shows an honest zero plus the
"not being recorded yet" note — never a fabricated view count.
