/* Eatswada Vendor — unit tests for the backend-aligned upgrade logic.
 *
 * Run: node --test tests/
 *
 * These exercise the NEW pure helpers added in the upgrade by extracting their
 * source from index.html and evaluating it in isolation. No browser, no network,
 * no database. See VENDOR-API-CONTRACT.md for the endpoints each supports.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Pull a top-level `function name(...) { ... }` body out of the page by
// balancing braces from its declaration. Returns the source text.
function fnSource(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start !== -1, 'function ' + name + ' must exist in index.html');
  let i = html.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < html.length; j++) {
    const ch = html[j];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return html.slice(start, j + 1); }
  }
  throw new Error('unbalanced braces for ' + name);
}

// Build a sandbox with a supplied `state`/`DAYS` etc. and return the helper.
function loadFn(name, ctx) {
  const keys = Object.keys(ctx || {});
  const body = fnSource(name);
  const fn = new Function(...keys, body + '\nreturn ' + name + ';')(...keys.map(k => ctx[k]));
  return fn;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/* ---------------- nextOpeningAt ---------------- */
test('nextOpeningAt returns the next scheduled opening after now', () => {
  // Restaurant opens every day at 09:00. From Tue 08:00 the next opening is Tue 09:00.
  const openingHours = {};
  for (const d of DAYS) openingHours[d] = { closed: false, opensAt: '09:00', closesAt: '22:00' };
  const nextOpeningAt = loadFn('nextOpeningAt', { state: { restaurant: { openingHours } }, DAYS });
  const now = new Date('2026-10-27T08:00:00'); // Tuesday
  const at = nextOpeningAt(now);
  assert.ok(at instanceof Date);
  assert.equal(at.getDay(), now.getDay(), 'same day, later hour');
  assert.equal(at.getHours(), 9);
  assert.equal(at.getMinutes(), 0);
  assert.ok(at.getTime() > now.getTime());
});

test('nextOpeningAt skips closed days and today-past-open', () => {
  const openingHours = {};
  for (const d of DAYS) openingHours[d] = { closed: true, opensAt: '09:00', closesAt: '22:00' };
  openingHours.friday = { closed: false, opensAt: '10:30', closesAt: '22:00' };
  const nextOpeningAt = loadFn('nextOpeningAt', { state: { restaurant: { openingHours } }, DAYS });
  // Wed 12:00 -> next opening is Friday 10:30.
  const at = nextOpeningAt(new Date('2026-10-28T12:00:00'));
  assert.equal(at.getDay(), 5, 'Friday');
  assert.equal(at.getHours(), 10);
  assert.equal(at.getMinutes(), 30);
});

test('nextOpeningAt returns null when no usable schedule exists', () => {
  const nextOpeningAt = loadFn('nextOpeningAt', { state: { restaurant: {} }, DAYS });
  assert.equal(nextOpeningAt(new Date()), null);
});

/* ---------------- restockTimestampFor ---------------- */
test('restockTimestampFor maps delay options to server timestamps', () => {
  const openingHours = {};
  for (const d of DAYS) openingHours[d] = { closed: false, opensAt: '09:00', closesAt: '22:00' };
  const restockTimestampFor = loadFn('restockTimestampFor', {
    state: { restaurant: { openingHours } }, DAYS, nextOpeningAt: loadFn('nextOpeningAt', { state: { restaurant: { openingHours } }, DAYS })
  });
  const before = Date.now();
  const two = restockTimestampFor('2h');
  assert.ok(two.getTime() >= before + 2 * 3600000 - 1000 && two.getTime() <= Date.now() + 2 * 3600000 + 1000);
  const four = restockTimestampFor('4h');
  assert.ok(four.getTime() >= before + 4 * 3600000 - 1000);
  // manual => null, so toggle-stock clears any auto turn-on.
  assert.equal(restockTimestampFor('manual'), null);
  // next_open always yields a real future timestamp even with no schedule.
  const nextOpen = restockTimestampFor('next_open');
  assert.ok(nextOpen instanceof Date && nextOpen.getTime() > Date.now());
});

/* ---------------- isSelfDeliveryOrder ---------------- */
test('isSelfDeliveryOrder follows the restaurant current mode the server gates on', () => {
  // The backend refuses OTP verification unless the restaurant's CURRENT mode is
  // self_delivery, so the current mode must win over a stale order snapshot.
  const selfNow = loadFn('isSelfDeliveryOrder', { state: { restaurant: { deliveryMode: 'self_delivery' } } });
  assert.equal(selfNow({ deliveryModeSnapshot: 'eatswada_rider' }), true, 'current mode wins');
  assert.equal(selfNow({}), true);

  const riderNow = loadFn('isSelfDeliveryOrder', { state: { restaurant: { deliveryMode: 'eatswada_rider' } } });
  assert.equal(riderNow({ deliveryModeSnapshot: 'self_delivery' }), false, 'server would 409, so no button');
  assert.equal(riderNow({}), false);
});

test('isSelfDeliveryOrder falls back to the order snapshot before the restaurant loads', () => {
  const unknown = loadFn('isSelfDeliveryOrder', { state: { restaurant: null } });
  assert.equal(unknown({ deliveryModeSnapshot: 'self_delivery' }), true);
  assert.equal(unknown({ deliveryModeSnapshot: 'eatswada_rider' }), false);
  assert.equal(unknown({}), false);
  assert.equal(unknown(null), false);
});

/* ---------------- platformFlagsOf ---------------- */
test('platformFlagsOf reads the public-status whitelist and never invents a flag', () => {
  const platformFlagsOf = loadFn('platformFlagsOf', {});
  // Empty payload => nothing on.
  const empty = platformFlagsOf(null);
  assert.equal(empty.maintenance, false);
  assert.equal(empty.shortage, false);
  assert.equal(empty.rain, false);
  assert.equal(empty.codDisabled, false);

  // Nested under data.settings or flat, both work.
  const nested = platformFlagsOf({ settings: { isUnderMaintenance: true, isCodEnabled: false } });
  assert.equal(nested.maintenance, true);
  assert.equal(nested.codDisabled, true);

  // isCodEnabled defaults to undefined -> not disabled (no false alarm).
  assert.equal(platformFlagsOf({}).codDisabled, false);
  // An explicit false is the only thing that disables COD.
  assert.equal(platformFlagsOf({ isCodEnabled: false }).codDisabled, true);
  assert.equal(platformFlagsOf({ isCodEnabled: true }).codDisabled, false);
});

/* ---------------- menu card gating ---------------- */
test('renderMenuCard withholds edit/delete while caps are off', () => {
  const caps = { menuEdit: false, menuDelete: false, inventoryQty: true };
  const helpers = {
    escapeHtml: (s) => String(s == null ? '' : s),
    formatMoney: (v) => '₹' + v,
    menuApprovalBadge: () => '',
    caps,
    document: { createElement: () => ({ className: '', dataset: {}, set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; } }) }
  };
  const renderMenuCard = loadFn('renderMenuCard', helpers);
  const card = renderMenuCard({ _id: 'm1', name: 'Tea', price: 20, inStock: true, category: 'Drinks' });
  assert.doesNotMatch(card.innerHTML, /data-menu-edit/, 'no edit button without the route');
  assert.doesNotMatch(card.innerHTML, /data-menu-del/, 'no delete button without the route');
  assert.match(card.innerHTML, /data-menu-inventory/, 'stock button present when inventoryQty is on');
});

test('renderMenuCard shows quantity only when the item tracks stock', () => {
  const helpers = {
    escapeHtml: (s) => String(s == null ? '' : s),
    formatMoney: (v) => '₹' + v,
    menuApprovalBadge: () => '',
    caps: { menuEdit: false, menuDelete: false, inventoryQty: true },
    document: { createElement: () => ({ className: '', dataset: {}, set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; } }) }
  };
  const renderMenuCard = loadFn('renderMenuCard', helpers);
  const tracked = renderMenuCard({ _id: 'm2', name: 'Biryani', price: 200, inStock: true, trackStock: true, stockQuantity: 7 });
  assert.match(tracked.innerHTML, /7 in stock/);
  const untracked = renderMenuCard({ _id: 'm3', name: 'Water', price: 10, inStock: true });
  assert.doesNotMatch(untracked.innerHTML, /in stock<\/span>/);
});
