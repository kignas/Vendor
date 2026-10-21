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

function buildDom(url = 'http://localhost/index.html') {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const config = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
  // Drop CDN scripts (jsdom would not fetch them anyway) and inline config.js
  // so the page's own inline script has window.EATSWADA_CONFIG at parse time.
  html = html.replace(/<script[^>]+src="https:\/\/[^"]+"[^>]*><\/script>/g, '');
  html = html.replace('<script src="./config.js"></script>', '<script>' + config + '</script>');

  const dom = new JSDOM(html, {
    url: url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      if (!window.AbortController) window.AbortController = AbortController;
      window.localStorage.setItem('nearbite_vendor_token', 'test-token');
      window.confirm = () => true;
      window.fetch = async (url) => {
        const u = String(url);
        const json = (body) => ({ ok: true, status: 200, json: async () => body });
        if (u.includes('/vendor/restaurant')) return json({ data: { name: 'Eatswada Test Kitchen', availability: { status: 'open' }, serviceArea: 'Durgapur', isOpen: true } });
        if (u.includes('/vendor/orders')) return json({ data: [ORDER] });
        if (u.includes('/vendor/earnings/summary')) return json({ data: { current: {} } });
        if (u.includes('/notifications')) return json({ data: [] });
        return json({ data: [] });
      };
    }
  });
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

test('restock controls stay disabled when the capability is off', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const dom = buildDom();
  const { window } = dom;
  await tick(60);
  const doc = window.document;
  doc.querySelector('.more-row[data-more="inventory"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  assert.equal(doc.getElementById('restockScheduleBtn').disabled, true);
  assert.equal(doc.getElementById('restockDelay').disabled, true);
  assert.match(doc.getElementById('restockGap').textContent, /Not available yet/);
  dom.window.close();
});

test('a ?cap= URL cannot enable an unverified capability or reach its endpoint', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const requested = [];
  const dom = buildDom('http://localhost/index.html?cap=autoRestock,complaints');
  const { window } = dom;
  window.fetch = async (url, opts) => {
    requested.push(String(url) + ' ' + String((opts && opts.method) || 'GET'));
    return { ok: true, status: 200, json: async () => ({ data: [] }) };
  };
  await tick(60);
  const doc = window.document;

  // The restock controls must still be inert despite the crafted URL.
  doc.querySelector('.more-row[data-more="inventory"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  assert.equal(doc.getElementById('restockScheduleBtn').disabled, true);
  assert.equal(doc.getElementById('restockDelay').disabled, true);
  assert.match(doc.getElementById('restockGap').textContent, /Not available yet/);

  // Clicking schedule anyway must not send any restock request.
  doc.getElementById('restockScheduleBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const restockCalls = requested.filter(r => /\/menu\/restock/.test(r));
  assert.deepEqual(restockCalls, [], 'no restock request may be sent via a ?cap= URL');
  dom.window.close();
});
