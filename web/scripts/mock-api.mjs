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
  if (path === '/api/vendor/orders') {
    if (url.searchParams.get('view') === 'history') return send(res, 200, { data: { rows: [], total: 0 } });
    return send(res, 200, { data: orders });
  }
  if (path === '/api/vendor/menu') return send(res, 200, { data: menu });
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

  const put = path.match(/^\/api\/vendor\/orders\/([^/]+)\/(accept|reject|ready|status)$/);
  if (put && req.method === 'PUT') {
    const id = put[1];
    orders = orders.map((o) => (o._id === id ? { ...o, status: put[2] === 'accept' ? 'confirmed' : o.status } : o));
    return send(res, 200, { success: true });
  }
  return send(res, 404, { message: `No mock for ${req.method} ${path}` });
});

server.listen(port, () => console.log(`mock api on ${port}`));
