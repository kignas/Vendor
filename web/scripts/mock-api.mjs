/**
 * Dev-only mock of the vendor API for local smoke tests. Serves the same shapes
 * the real backend returns for the routes the ported app uses. Never shipped.
 *
 *   node web/scripts/mock-api.mjs [port]
 */
import http from 'node:http';

const port = Number(process.argv[2] || 4600);

const restaurant = {
  _id: 'r1',
  name: 'Spice Route Kitchen',
  isVerified: true,
  availability: 'open',
  deliveryMode: 'eatswada_rider',
};

let orders = [
  {
    _id: 'ord_1',
    publicOrderId: 'SW-1001',
    status: 'placed',
    customerName: 'Asha Rao',
    customerOrderCount: 3,
    createdAt: new Date().toISOString(),
    restaurantResponseDeadline: new Date(Date.now() + 5 * 60_000).toISOString(),
    items: [{ name: 'Masala Dosa', quantity: 2, isVeg: true }],
    paymentStatus: 'paid',
    vendorBill: { itemSubtotal: 260, commission: 39, restaurantNetAmount: 221 },
    customerInstructions: 'Less spicy please',
  },
  {
    _id: 'ord_2',
    publicOrderId: 'SW-1002',
    status: 'preparing',
    customerName: 'Rahul Mehta',
    createdAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    items: [{ name: 'Butter Chicken', quantity: 1, foodType: 'non-veg' }],
    paymentMode: 'cod',
    vendorBill: { itemSubtotal: 420, commission: 63, restaurantNetAmount: 357 },
  },
];

const menu = [
  { _id: 'm1', name: 'Masala Dosa', category: 'Breakfast', price: 130, inStock: true },
  { _id: 'm2', name: 'Butter Chicken', category: 'Mains', price: 420, inStock: false },
];

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    });
    return res.end();
  }

  const auth = req.headers.authorization || '';
  if (path !== '/api/auth/vendor/login' && !auth.startsWith('Bearer ')) {
    return send(res, 401, { message: 'Unauthorized' });
  }

  if (path === '/api/auth/vendor/login' && req.method === 'POST') {
    return send(res, 200, { success: true, token: 'mock-token', user: { name: 'Vendor' }, restaurant });
  }
  if (path === '/api/vendor/restaurant') return send(res, 200, { data: restaurant });
  if (path === '/api/vendor/restaurant/availability' && req.method === 'PUT') {
    return send(res, 200, { data: { availability: 'temporarily_closed' } });
  }
  if (path === '/api/vendor/restaurant/hours' && req.method === 'PUT') {
    return send(res, 200, { success: true });
  }
  if (path === '/api/vendor/restaurant/profile' && req.method === 'PUT') {
    return send(res, 200, { data: restaurant });
  }
  if (path === '/api/vendor/orders') {
    if (url.searchParams.get('view') === 'history') return send(res, 200, { data: { rows: [], total: 0 } });
    return send(res, 200, { data: orders });
  }
  if (path === '/api/vendor/menu') return send(res, 200, { data: menu });
  if (path === '/api/vendor-applications' && req.method === 'POST') {
    return send(res, 200, { success: true, data: { id: 'APP-1234', statusToken: 'tok-xyz' } });
  }
  if (path.match(/^\/api\/vendor-applications\/[^/]+\/status$/) && req.method === 'GET') {
    return send(res, 200, {
      success: true,
      data: { status: 'under_review', restaurantName: 'Spice Route Kitchen' },
    });
  }
  if (path.match(/^\/api\/vendor\/menu\/[^/]+\/inventory$/) && req.method === 'PUT') {
    return send(res, 200, { data: { ...menu[0], trackStock: true, stockQuantity: 12 } });
  }
  if (path.match(/^\/api\/vendor\/menu\/[^/]+\/toggle-stock$/) && req.method === 'PUT') {
    const id = path.split('/')[4];
    const item = menu.find((m) => m._id === id);
    if (item) item.inStock = !item.inStock;
    return send(res, 200, { data: item ?? {} });
  }
  if (path === '/api/vendor/menu/availability/bulk' && req.method === 'PUT') {
    return send(res, 200, { data: { modifiedCount: 2 }, message: 'Availability updated.' });
  }
  if (path === '/api/vendor/inventory/history') {
    return send(res, 200, {
      data: [{ change: -2, after: 8, reason: 'order_accepted', createdAt: new Date().toISOString() }],
    });
  }
  if (path === '/api/vendor/profile') return send(res, 200, { data: restaurant });
  if (path === '/api/vendor/policies') {
    return send(res, 200, { data: { privacyPolicy: '2026-01', termsOfService: '2026-01' } });
  }
  if (path === '/api/vendor/settings') {
    if (req.method === 'PUT') return send(res, 200, { message: 'Settings saved.' });
    return send(res, 200, {
      data: {
        businessType: 'restaurant',
        deliveryMode: 'eatswada_rider',
        commissionRate: 15,
        commissionPlan: 'standard',
        maxActiveOrders: 20,
        activeOrders: 3,
        availableSlots: 17,
        settlementSchedule: 'weekly',
      },
    });
  }
  if (path === '/api/vendor/onboarding/config') {
    return send(res, 200, {
      data: { maxActiveOrders: { min: 1, max: 500 }, settlementSchedules: ['weekly', 'monthly'] },
    });
  }
  if (path === '/api/vendor/support') {
    if (req.method === 'POST') return send(res, 200, { success: true });
    return send(res, 200, {
      data: [
        {
          _id: 'tk1',
          subject: 'Payout not received',
          category: 'settlements',
          status: 'open',
          message: 'My settlement for last week is missing.',
          createdAt: new Date().toISOString(),
        },
        { _id: 'tk2', subject: 'Menu image upload', category: 'menu', status: 'resolved', createdAt: new Date().toISOString() },
      ],
    });
  }
  if (path.match(/^\/api\/vendor\/support\/[^/]+\/reply$/) && req.method === 'POST') {
    return send(res, 200, { success: true });
  }
  if (path === '/api/notifications') {
    return send(res, 200, {
      data: [
        { _id: 'n1', title: 'New order received', body: 'Order SW-1001 is waiting for acceptance.', createdAt: new Date().toISOString() },
        { _id: 'n2', title: 'Settlement processed', body: '₹3,100 settled to your bank.', createdAt: new Date(Date.now() - 86400_000).toISOString(), readAt: new Date().toISOString() },
      ],
    });
  }
  if (path.match(/^\/api\/notifications\/[^/]+\/read$/) && req.method === 'PATCH') {
    return send(res, 200, { success: true });
  }
  if (path === '/api/vendor/earnings/summary') {
    return send(res, 200, {
      data: { current: { deliveredFoodSales: 5200, deliveredCommission: 780, deliveredEarnings: 4420, inProgress: 900 } },
    });
  }
  if (path === '/api/vendor/settlements/summary') {
    return send(res, 200, { data: { eligibleBalance: 3100, availableBalance: 1200 } });
  }
  if (path === '/api/vendor/settlements/withdrawals') return send(res, 200, { data: [] });
  if (path === '/api/vendor/earnings/orders') return send(res, 200, { data: [] });

  if (path === '/api/vendor/reviews') {
    return send(res, 200, {
      data: [
        {
          _id: 'rv1',
          score: 5,
          comment: 'Best masala dosa in town!',
          user: { name: 'Asha Rao', orderCount: 4 },
          createdAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
          orderNumber: 'SW-1001',
        },
        {
          _id: 'rv2',
          score: 3,
          comment: 'Food was good but delivery was slow.',
          user: { name: 'Rahul Mehta' },
          createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
          vendorReply: { message: 'Sorry for the delay, we are working on it.', createdAt: new Date().toISOString() },
        },
      ],
      summary: { rating: 4.3, ratingCount: 28, reviewCount: 12 },
      total: 12,
    });
  }
  if (path.match(/^\/api\/vendor\/reviews\/[^/]+\/reply$/) && req.method === 'POST') {
    return send(res, 200, { success: true });
  }

  if (path === '/api/vendor/analytics') {
    const period = url.searchParams.get('period') || '7d';
    return send(res, 200, {
      period,
      currency: 'INR',
      summary: {
        totalOrders: 86,
        deliveredOrders: 74,
        cancelledOrders: 6,
        deliveredFoodSales: 48250,
        averageDeliveredOrderValue: 652,
      },
      statusCounts: [],
      daily: [
        { date: '2026-10-25', orders: 12, deliveredSales: 7600 },
        { date: '2026-10-26', orders: 15, deliveredSales: 9100 },
        { date: '2026-10-27', orders: 9, deliveredSales: 5400 },
      ],
      topItems: [
        { name: 'Masala Dosa', quantity: 42, sales: 5460 },
        { name: 'Butter Chicken', quantity: 28, sales: 11760 },
      ],
    });
  }
  if (path === '/api/vendor/analytics/visits') {
    return send(res, 200, {
      data: {
        summary: { totalViews: 320, uniqueVisitors: 180 },
        daily: [
          { day: '2026-10-26', views: 120, uniqueVisitors: 70 },
          { day: '2026-10-27', views: 90, uniqueVisitors: 55 },
        ],
        byEventType: [
          { eventType: 'menu_view', count: 210 },
          { eventType: 'restaurant_view', count: 110 },
        ],
      },
    });
  }

  const put = path.match(/^\/api\/vendor\/orders\/([^/]+)\/(accept|reject|ready|status)$/);
  if (put && req.method === 'PUT') {
    const id = put[1];
    orders = orders.map((o) => (o._id === id ? { ...o, status: put[2] === 'accept' ? 'confirmed' : o.status } : o));
    return send(res, 200, { success: true });
  }
  return send(res, 404, { message: `No mock for ${req.method} ${path}` });
});

server.listen(port, () => console.log(`mock api on ${port}`));
