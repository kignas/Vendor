/* Eatswada Vendor — DOM smoke test (jsdom, stubbed API, no real network).
 *
 * Run:  NODE_PATH=/path/to/node_modules node --test tests/dom.smoke.test.mjs
 * If jsdom is not resolvable the test is skipped, so `node --test tests/` on a
 * machine without jsdom still passes the contract suite.
 *
 * This boots the real index.html with the real inline script and a stubbed
 * fetch, then asserts what the vendor actually sees. It is NOT an end-to-end
 * test against a live backend or database.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let JSDOM = null;
try { ({ JSDOM } = await import('jsdom')); } catch { /* optional */ }

const ORDER = {
  _id: 'aaaaaaaaaaaa',
  publicOrderId: 'ORD-1042',
  status: 'preparing',
  createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
  acceptedAt: new Date(Date.now() - 3 * 60000).toISOString(),
  estimatedReadyAt: new Date(Date.now() + 12 * 60000).toISOString(),
  customerName: 'Asha Devi',
  customerPhone: '9876543210',
  customerOrderCount: 7,
  deliveryAddress: { area: 'City Centre', city: 'Durgapur' },
  restaurantNote: 'Less spicy please',
  cutlery: true,
  total: 480,
  items: [
    { name: 'Paneer Tikka', quantity: 2, isVeg: true, variant: 'Half' },
    { name: 'Chicken Biryani', quantity: 1, isVeg: false }
  ],
  vendorBill: { itemSubtotal: 400, packagingCharge: 20, platformCommission: 60, vendorNet: 360 }
};

function buildDom(url = 'http://localhost/index.html', overrides = {}) {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const config = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
  // Drop CDN scripts (jsdom would not fetch them anyway) and inline config.js
  // so the page's own inline script has window.EATSWADA_CONFIG at parse time.
  html = html.replace(/<script[^>]+src="https:\/\/[^"]+"[^>]*><\/script>/g, '');
  html = html.replace('<script src="./config.js"></script>', '<script>' + config + '</script>');

  const calls = [];
  const dom = new JSDOM(html, {
    url: url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      if (!window.AbortController) window.AbortController = AbortController;
      window.localStorage.setItem('nearbite_vendor_token', 'test-token');
      window.confirm = () => true;
      window.fetch = async (url, opts) => {
        const u = String(url);
        calls.push({ url: u, method: (opts && opts.method) || 'GET', body: opts && opts.body });
        const json = (body) => ({ ok: true, status: 200, json: async () => body });
        if (overrides.fetch) { const r = overrides.fetch(u, opts, json); if (r) return r; }
        if (u.includes('/vendor/restaurant/profile')) return json({ data: { name: 'Eatswada Test Kitchen' } });
        if (u.includes('/vendor/restaurant')) return json({ data: { name: 'Eatswada Test Kitchen', availability: { status: 'open' }, serviceArea: 'Durgapur', isOpen: true, deliveryMode: 'self_delivery' } });
        if (u.includes('/vendor/orders')) return json({ data: [ORDER] });
        if (u.includes('/vendor/earnings/summary')) return json({ data: { current: {} } });
        if (u.includes('/platform/public-status')) return json({ data: { isCodEnabled: false } });
        if (u.includes('/vendor/menu/') && u.includes('/inventory')) return json({ data: { _id: 'm1', trackStock: true, stockQuantity: 3, inStock: true }, message: 'Stock updated.' });
        if (u.includes('/vendor/menu/availability/bulk')) return json({ data: { modifiedCount: 1 }, message: 'Availability updated.' });
        if (u.includes('/vendor/menu/') && u.includes('/toggle-stock')) return json({ data: { _id: 'm1', inStock: false, autoTurnOnAt: null }, message: 'Stock updated.' });
        if (u.includes('/vendor/menu')) return json({ data: [{ _id: 'm1', name: 'Paneer Tikka', price: 180, inStock: true, trackStock: true, stockQuantity: 5, category: 'Starters' }] });
        if (u.includes('/vendor/inventory/history')) return json({ data: [{ change: -2, after: 3, reason: 'order_accept', createdAt: new Date().toISOString() }] });
        if (u.includes('/vendor/settlements/summary')) return json({ data: { currency: 'INR', settlementSchedule: 'weekly', eligibleBalance: 1250.5, availableForWithdrawal: 1250.5, activePayoutRequest: null } });
        if (u.includes('/vendor/settlements/withdrawals')) return json({ data: [{ _id: 'w1', amount: 500, status: 'paid', bankUtr: 'UTR123', createdAt: new Date().toISOString() }] });
        if (u.includes('/vendor/settlements/withdraw')) return json({ success: true, message: 'Withdrawal requested.' });
        if (u.includes('/vendor/settings')) return json({ data: { maxActiveOrders: 20, activeOrders: 4, availableSlots: 16, settlementSchedule: 'weekly', deliveryMode: 'self_delivery', commissionRate: 18 } });
        if (u.includes('/vendor/analytics/visits')) return json({ data: { summary: { totalViews: 120, uniqueVisitors: 80 } } });
        if (u.includes('/vendor/analytics')) return json({ data: { summary: { totalOrders: 12, deliveredOrders: 10, cancelledOrders: 2, deliveredFoodSales: 4000, averageDeliveredOrderValue: 400 } } });
        if (u.includes('/vendor/orders/') && u.includes('/verify-delivery-otp')) return json({ success: true, message: 'PIN verified.' });
        if (u.includes('/notifications')) return json({ data: [] });
        return json({ data: [] });
      };
    }
  });
  dom.__calls = calls;
  return dom;
}

const tick = (ms) => new Promise(r => setTimeout(r, ms));

test('dashboard boots, renders the order and its kitchen workflow', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const dom = buildDom();
  const { window } = dom;
  await tick(60); // let init()'s async loads settle

  const doc = window.document;
  const rail = doc.getElementById('ticketRail');
  assert.ok(rail, 'ticket rail exists');

  // Outlet header reflects the restaurant payload.
  assert.equal(doc.getElementById('restaurantName').textContent, 'Eatswada Test Kitchen');
  assert.equal(doc.getElementById('outletStatusText').textContent, 'Open');
  assert.equal(doc.getElementById('outletAreaChip').hidden, false);

  // Enter the Orders section (where the search box lives) and open Preparing.
  doc.querySelector('.section-tab[data-section="orders"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
  const preparingTab = doc.querySelector('.tab[data-tab="preparing"]');
  preparingTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
  assert.match(rail.innerHTML, /ORD-1042/);

  // Prep countdown comes from the persisted server timestamp, not a local reset.
  const strip = rail.querySelector('.prep-strip[data-prep-deadline]');
  assert.ok(strip, 'prep strip rendered from estimatedReadyAt');
  assert.ok(Number(strip.dataset.prepDeadline) > Date.now(), 'deadline is in the future');

  // Dietary marks come from item flags.
  assert.match(rail.innerHTML, /diet-mark veg/);
  assert.match(rail.innerHTML, /diet-mark nonveg/);

  // Bill breakdown uses the server figures only.
  const bill = rail.querySelector('.bill-details');
  assert.ok(bill, 'bill details rendered');
  assert.match(bill.innerHTML, /Platform commission/);
  assert.match(bill.innerHTML, /Your net receivable/);

  // Customer order count and pickup-free meta are shown honestly.
  assert.match(rail.innerHTML, /7 orders with you/);

  // Order search filters the current view.
  const search = doc.getElementById('orderSearch');
  search.value = 'zzz-no-match';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await tick(10);
  assert.match(rail.innerHTML, /No matches/);
  search.value = 'asha';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await tick(10);
  assert.match(rail.innerHTML, /ORD-1042/);

  dom.window.close();
});

test('order card renders for a legacy order with no optional fields', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const dom = buildDom();
  const { window } = dom;
  // Replace the queue with a minimal legacy order before the queue renders.
  await tick(60);
  const doc = window.document;
  const legacy = { _id: 'bbbbbbbbbbbb', publicOrderId: 'ORD-1', status: 'placed', createdAt: new Date().toISOString(), total: 100, items: [{ name: 'Tea', quantity: 1 }] };
  // Exercise the renderer directly through a fresh queue poll.
  window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: [legacy] }) });
  doc.getElementById('refreshBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const rail = doc.getElementById('ticketRail');
  assert.match(rail.innerHTML, /ORD-1/);
  // Neutral dietary fallback, not a guess.
  assert.match(rail.innerHTML, /Diet not specified/);
  // No bill breakdown object -> honest fallback note.
  assert.match(rail.innerHTML, /not available for this order/);
  dom.window.close();
});

test('restock panel points at the per-item control and sends no bulk request', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const requested = [];
  const dom = buildDom();
  const { window } = dom;
  window.fetch = async (url, opts) => {
    requested.push(String(url) + ' ' + String((opts && opts.method) || 'GET'));
    return { ok: true, status: 200, json: async () => ({ data: [] }) };
  };
  await tick(60);
  const doc = window.document;
  doc.querySelector('.more-row[data-more="inventory"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  // There is no bulk schedule/cancel route, so those controls stay disabled.
  assert.equal(doc.getElementById('restockScheduleBtn').disabled, true);
  assert.equal(doc.getElementById('restockDelay').disabled, true);
  assert.match(doc.getElementById('restockGap').textContent, /autoTurnOnAt/);
  // Clicking schedule anyway must not send any restock request.
  doc.getElementById('restockScheduleBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const restockCalls = requested.filter(r => /\/menu\/restock/.test(r));
  assert.deepEqual(restockCalls, [], 'no /menu/restock request may ever be sent');
  dom.window.close();
});

test('a ?cap= URL cannot enable an unverified capability or reach its endpoint', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const requested = [];
  const dom = buildDom('http://localhost/index.html?cap=complaints,menuEdit,menuDelete');
  const { window } = dom;
  window.fetch = async (url, opts) => {
    requested.push(String(url) + ' ' + String((opts && opts.method) || 'GET'));
    return { ok: true, status: 200, json: async () => ({ data: [] }) };
  };
  await tick(60);
  const doc = window.document;

  // The gated features must stay inert despite the crafted URL.
  doc.querySelector('.more-row[data-more="inventory"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  assert.equal(doc.getElementById('restockScheduleBtn').disabled, true);

  // Reviews tab -> Complaints must state the backend gap, not fetch /complaints.
  doc.querySelector('.section-tab[data-section="reviews"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  doc.querySelector('.rv-tab[data-rv-tab="complaints"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const complaintCalls = requested.filter(r => /\/complaints/.test(r));
  assert.deepEqual(complaintCalls, [], 'no /complaints request may be sent via a ?cap= URL');
  dom.window.close();
});

test('self-delivery order shows the PIN button and verifies via the real endpoint', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const selfOrder = Object.assign({}, ORDER, { status: 'out_for_delivery', deliveryModeSnapshot: 'self_delivery' });
  const dom = buildDom('http://localhost/index.html', {
    fetch: (u, opts, json) => { if (u.includes('/vendor/orders')) return json({ data: [selfOrder] }); return null; }
  });
  const { window } = dom;
  await tick(60);
  const doc = window.document;
  doc.querySelector('.section-tab[data-section="orders"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
  doc.querySelector('.tab[data-tab="dispatch"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(30);
  const rail = doc.getElementById('ticketRail');
  assert.match(rail.innerHTML, /Verify delivery PIN/, 'self-delivery order exposes PIN verification');

  rail.querySelector('[data-action="verify-otp"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
  doc.getElementById('otpInput').value = '1234';
  doc.getElementById('otpSubmit').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const otpCall = dom.__calls.find(c => /verify-delivery-otp/.test(c.url));
  assert.ok(otpCall, 'PIN is verified server-side');
  assert.equal(otpCall.method, 'POST');
  assert.deepEqual(JSON.parse(otpCall.body), { otp: '1234' });
  dom.window.close();
});

test('an eatswada-rider order never shows the PIN button', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const riderOrder = Object.assign({}, ORDER, { status: 'out_for_delivery', deliveryModeSnapshot: 'eatswada_rider' });
  const dom = buildDom('http://localhost/index.html', {
    fetch: (u, opts, json) => {
      if (u.includes('/vendor/orders')) return json({ data: [riderOrder] });
      // Restaurant currently delivers with Eatswada riders, so the server would
      // 409 on OTP verification and the button must stay hidden.
      if (u.includes('/vendor/restaurant')) return json({ data: { name: 'Rider Kitchen', deliveryMode: 'eatswada_rider', isOpen: true } });
      return null;
    }
  });
  const { window } = dom;
  await tick(60);
  const doc = window.document;
  doc.querySelector('.section-tab[data-section="orders"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
  doc.querySelector('.tab[data-tab="dispatch"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(30);
  assert.doesNotMatch(doc.getElementById('ticketRail').innerHTML, /Verify delivery PIN/);
  dom.window.close();
});

test('the platform banner reflects public-status and hides when unavailable', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const dom = buildDom('http://localhost/index.html', {
    fetch: (u, opts, json) => { if (u.includes('/platform/public-status')) return json({ data: { isUnderMaintenance: true, isCodEnabled: false } }); return null; }
  });
  const { window } = dom;
  await tick(80);
  const banner = window.document.getElementById('platformBanner');
  assert.ok(banner, 'banner element exists');
  assert.equal(banner.hidden, false, 'maintenance banner is shown');
  assert.match(banner.innerHTML, /Under Maintenance/);
  assert.match(banner.innerHTML, /Cash on Delivery is switched off/);
  dom.window.close();
});

test('finance reads the vendor settlement summary and never calls an admin route', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const dom = buildDom();
  const { window } = dom;
  await tick(60);
  const doc = window.document;
  doc.querySelector('.section-tab[data-section="earnings"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(60);
  assert.match(doc.getElementById('financeStats').innerHTML, /Eligible balance/);
  assert.match(doc.getElementById('financeStats').innerHTML, /Available for withdrawal/);
  // A completed payout from the withdrawals list drives the "last payout" cell.
  assert.match(doc.getElementById('fin-last-payout').textContent, /500/);
  assert.equal(doc.getElementById('fin-utr-value').textContent, 'UTR123');
  const bad = dom.__calls.filter(c => /settlements\/payouts|payout-request/.test(c.url));
  assert.deepEqual(bad, [], 'no admin/absent settlement route is called');
  dom.window.close();
});

test('settings save sends only the fields the backend accepts', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const dom = buildDom();
  const { window } = dom;
  await tick(60);
  const doc = window.document;
  doc.querySelector('.section-tab[data-section="more"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
  doc.querySelector('.more-row[data-more="settings"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(60);
  const body = doc.getElementById('settingsBody');
  assert.match(body.innerHTML, /Maximum active orders/);
  const cap = doc.getElementById('setMaxActive');
  cap.value = '35';
  doc.getElementById('settingsSaveBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const call = dom.__calls.find(c => /\/vendor\/settings/.test(c.url) && c.method === 'PUT');
  assert.ok(call, 'settings PUT is sent');
  const payload = JSON.parse(call.body);
  assert.deepEqual(Object.keys(payload).sort(), ['maxActiveOrders', 'settlementSchedule'], 'only allow-listed keys are sent');
  assert.equal(payload.maxActiveOrders, 35);
  dom.window.close();
});

test('profile editor writes through the vendor profile route', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const dom = buildDom();
  const { window } = dom;
  await tick(60);
  const doc = window.document;
  doc.querySelector('.section-tab[data-section="more"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
  doc.querySelector('.more-row[data-more="store"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(80);
  const edit = doc.getElementById('profileEditBtn');
  assert.ok(edit, 'edit button is present when the route exists');
  edit.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(20);
  doc.getElementById('pfName').value = 'New Kitchen Name';
  doc.getElementById('profileSave').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const call = dom.__calls.find(c => /restaurant\/profile/.test(c.url) && c.method === 'PUT');
  assert.ok(call, 'profile PUT is sent to the vendor route');
  assert.equal(JSON.parse(call.body).name, 'New Kitchen Name');
  dom.window.close();
});

test('per-item inventory sheet posts quantity to the inventory route', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const dom = buildDom();
  const { window } = dom;
  await tick(60);
  const doc = window.document;
  doc.querySelector('.section-tab[data-section="menu"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(60);
  const invBtn = doc.querySelector('[data-menu-inventory]');
  assert.ok(invBtn, 'stock button is rendered');
  invBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  assert.equal(doc.getElementById('invSheet').classList.contains('open'), true, 'inventory sheet opens');
  doc.getElementById('inviQty').value = '9';
  doc.getElementById('invSheetSave').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const call = dom.__calls.find(c => /\/menu\/m1\/inventory/.test(c.url) && c.method === 'PUT');
  assert.ok(call, 'inventory PUT is sent');
  assert.equal(JSON.parse(call.body).stockQuantity, 9);
  dom.window.close();
});
