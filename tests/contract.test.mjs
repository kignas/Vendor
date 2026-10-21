/* Eatswada Vendor — contract & unit tests (no browser, no network).
 *
 * Run: node --test tests/
 *
 * These are STATIC / CONTRACT tests. They prove:
 *   - the page and theme still parse and keep the required integration points
 *   - the pure helper logic (diet markers, bill rows, search matching, KOT
 *     rendering, speech text) behaves for the documented shapes and for legacy
 *     orders with missing optional fields
 *   - no unsupported endpoint is called unless its capability flag is on
 * They do NOT prove end-to-end behaviour against a live backend or database.
 * See docs/UPGRADE-AUDIT.md for what remains unverified.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const theme = fs.readFileSync(path.join(ROOT, 'theme.css'), 'utf8');

/* ------------------------------------------------------------------ *
 * 1. Structural / integration preservation
 * ------------------------------------------------------------------ */
test('service worker and Capacitor push files are untouched', () => {
  for (const f of ['sw.js', 'firebase-messaging-sw.js', 'native-push.js', 'native-push-vendor.js']) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' must still exist');
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), /onBackgroundMessage/);
});

test('auth, API client and polling integration points are preserved', () => {
  assert.match(html, /function apiFetch\(/);
  assert.match(html, /function authHeaders\(/);
  assert.match(html, /function handleUnauthorized\(/);
  assert.match(html, /function startPolling\(/);
  // The token key is centralised in config.js and referenced via CFG.TOKEN_KEY.
  assert.match(html, /CFG\.TOKEN_KEY/);
  assert.match(fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8'), /nearbite_vendor_token/);
  // Existing order endpoints must still be called with the same shapes.
  assert.match(html, /\/orders\/' \+ id \+ '\/accept', \{ method: 'PUT', body: JSON\.stringify\(\{ prepMinutes:/);
  assert.match(html, /\/orders\/' \+ id \+ '\/reject', \{ method: 'PUT', body: JSON\.stringify\(\{ reason \}\)/);
  assert.match(html, /\/orders\/' \+ id \+ '\/status', \{ method: 'PUT' \}/);
});

test('backend order statuses are not renamed or remapped', () => {
  const statuses = ['placed', 'confirmed', 'preparing', 'waiting_for_rider', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'];
  for (const s of statuses) assert.ok(html.includes(s), 'status ' + s + ' must still be referenced');
});

test('security middleware assumptions are not loosened', () => {
  assert.doesNotMatch(html, /Access-Control-Allow-Origin/);
  assert.doesNotMatch(html, /dangerouslySetInnerHTML/);
});

test('inline scripts parse as valid JavaScript', () => {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m; let count = 0;
  while ((m = re.exec(html))) {
    count++;
    // Throwing here means a syntax error was introduced.
    new Function(m[1]);
  }
  assert.ok(count >= 1, 'expected at least one inline script block');
});

/* ------------------------------------------------------------------ *
 * 2. Design tokens
 * ------------------------------------------------------------------ */
test('--es-* tokens exist and alias the existing token system', () => {
  const required = ['--es-bg-canvas', '--es-surface-card', '--es-surface-rail', '--es-font-sans',
    '--es-ink-primary', '--es-ink-secondary', '--es-ink-muted', '--es-green-veg', '--es-green-soft',
    '--es-nonveg-brown', '--es-support-blue', '--es-reply-bubble', '--es-danger-red', '--es-star-gold',
    '--es-kpt-fill', '--es-kpt-track', '--es-border-subtle', '--es-radius-pill', '--es-radius-card', '--es-radius-btn'];
  for (const t of required) assert.ok(theme.includes(t + ':'), 'missing token ' + t);
  assert.match(theme, /--es-bg-canvas:var\(--page\)/);
  assert.match(theme, /--es-ink-primary:var\(--ink\)/);
  assert.match(theme, /--es-danger-red:var\(--danger\)/);
});

test('theme.css braces are balanced', () => {
  let depth = 0;
  for (const ch of theme) { if (ch === '{') depth++; else if (ch === '}') depth--; assert.ok(depth >= 0); }
  assert.equal(depth, 0);
});

/* ------------------------------------------------------------------ *
 * 3. Pure helpers, loaded out of the page source
 *    We evaluate only the helper block so the DOM-touching IIFE is not run.
 * ------------------------------------------------------------------ */
function loadHelpers() {
  const grab = (name) => {
    const start = html.indexOf('function ' + name + '(');
    assert.ok(start !== -1, 'helper ' + name + ' not found');
    // Walk braces to the end of the function body.
    let i = html.indexOf('{', start); let depth = 0; let end = i;
    for (; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    return html.slice(start, end);
  };
  const src = [
    'const caps = { prepCountdown: true, prepExtension: false, readyUndo: false, billBreakdown: true, autoRestock: false, complaints: false };',
    'const state = { restaurant: { name: "Eatswada Test Kitchen" } };',
    'function formatMoney(n){ return "\u20b9" + Number(n||0).toLocaleString("en-IN"); }',
    'function escapeHtml(str){ return String(str ?? "").replace(/[&<>"\']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;" }[c])); }',
    grab('dietOf'), grab('dietMarkHtml'), grab('firstNumber'), grab('itemMetaHtml'),
    grab('orderBillOf'), grab('billRows'), grab('billDetailsHtml'), grab('orderMatchesQuery'),
    grab('buildKotHtml'), grab('buildOrderSpeech'),
    'return { dietOf, dietMarkHtml, firstNumber, itemMetaHtml, orderBillOf, billRows, billDetailsHtml, orderMatchesQuery, buildKotHtml, buildOrderSpeech, caps };'
  ].join('\n');
  return new Function(src)();
}

const H = loadHelpers();

test('dietOf never infers dietary status from an item name', () => {
  assert.equal(H.dietOf({ name: 'Paneer Tikka' }), null, 'must not guess veg from the name');
  assert.equal(H.dietOf({ name: 'Chicken Biryani' }), null, 'must not guess non-veg from the name');
  assert.equal(H.dietOf({ isVeg: true }), 'veg');
  assert.equal(H.dietOf({ isVeg: false }), 'nonveg');
  assert.equal(H.dietOf({ foodType: 'veg' }), 'veg');
  assert.equal(H.dietOf({ foodType: 'Non-Veg' }), 'nonveg');
  assert.equal(H.dietOf(null), null);
});

test('billRows only uses server-provided figures and never invents a percentage', () => {
  assert.deepEqual(H.billRows({ total: 500 }), [], 'no breakdown object -> no rows');
  const rows = H.billRows({
    vendorBill: { itemSubtotal: 400, packagingCharge: 20, platformCommission: 60, vendorNet: 360 }
  });
  const labels = rows.map(r => r.label);
  assert.deepEqual(labels, ['Item subtotal', 'Packaging charge', 'Platform commission', 'Your net receivable']);
  assert.equal(rows.find(r => r.label === 'Your net receivable').kind, 'total');
});

test('discount is only labelled restaurant-funded when the server says so', () => {
  const generic = H.billRows({ vendorBill: { discount: 50 } });
  assert.equal(generic[0].label, 'Discount');
  const funded = H.billRows({ vendorBill: { discount: 50, discountFundedBy: 'restaurant' } });
  assert.equal(funded[0].label, 'Discount (restaurant-funded)');
});

test('billDetailsHtml falls back honestly when no breakdown exists', () => {
  const out = H.billDetailsHtml({ total: 250 });
  assert.match(out, /Total bill \/ Your earnings/);
  assert.match(out, /not available for this order/);
  assert.match(out, /\u20b9250/);
});

test('order search matches documented fields and tolerates legacy orders', () => {
  const o = { _id: 'abcdef123456', publicOrderId: 'ORD-9', customerName: 'Asha', customerPhone: '99999', items: [{ name: 'Dosa' }] };
  assert.equal(H.orderMatchesQuery(o, 'ord-9'), true);
  assert.equal(H.orderMatchesQuery(o, 'asha'), true);
  assert.equal(H.orderMatchesQuery(o, 'dosa'), true);
  assert.equal(H.orderMatchesQuery(o, 'zzz'), false);
  assert.equal(H.orderMatchesQuery({ _id: 'x' }, 'x'), true, 'legacy order without items must not throw');
  assert.equal(H.orderMatchesQuery({}, 'anything'), false);
});

test('KOT escapes customer-supplied text', () => {
  const kot = H.buildKotHtml({ _id: 'abcdef', items: [{ quantity: 1, name: '<img src=x onerror=alert(1)>' }] });
  assert.ok(!kot.includes('<img src=x'), 'KOT must escape HTML');
  assert.match(kot, /&lt;img/);
});

test('speech text is built from real order fields', () => {
  const s = H.buildOrderSpeech({ publicOrderId: 'ORD-1', customerName: 'Asha', items: [{ quantity: 2, name: 'Dosa' }] });
  assert.match(s, /ORD-1/);
  assert.match(s, /Asha/);
  assert.match(s, /2 Dosa/);
});

/* ------------------------------------------------------------------ *
 * 4. Capability gating: unsupported endpoints stay dormant
 * ------------------------------------------------------------------ */
test('unsupported backend features are capability-gated', () => {
  // The default flag values in the page must keep these off.
  assert.match(html, /autoRestock: false/);
  assert.match(html, /complaints: false/);
  // The capability set is closed: only these names may be toggled.
  const capsBlock = html.slice(html.indexOf('const caps = Object.freeze({'), html.indexOf('});', html.indexOf('const caps = Object.freeze({')));
  const names = [...capsBlock.matchAll(/^\s*([a-zA-Z]+):/gm)].map(m => m[1]);
  assert.deepEqual(names.sort(), ['autoRestock', 'billBreakdown', 'complaints', 'prepCountdown']);
});

test('there is no URL query-parameter capability override', () => {
  // The ?cap= mechanism must not exist anywhere in the page.
  assert.doesNotMatch(html, /URLSearchParams/, 'no URLSearchParams-driven capability override');
  assert.doesNotMatch(html, /get\(['"]cap['"]\)/, 'no cap= parameter read');
  assert.doesNotMatch(html, /location\.search/, 'the page must not read the query string for capabilities');
  // The flags are frozen, so nothing can enable them at runtime either.
  assert.match(html, /const caps = Object\.freeze\(\{/);
});

test('capability flags are immutable at runtime', () => {
  const src = html.slice(html.indexOf('const caps = Object.freeze({'), html.indexOf('});', html.indexOf('const caps = Object.freeze({')) + 3) + '\nreturn caps;';
  const caps = new Function(src)();
  assert.equal(caps.autoRestock, false);
  assert.equal(caps.complaints, false);
  assert.equal(Object.isFrozen(caps), true);
  // A write attempt must not change the value. In strict mode (module scope, and
  // the page's own IIFE) it throws; either way the flag must stay false.
  let threw = false;
  try { caps.autoRestock = true; } catch { threw = true; }
  assert.equal(caps.autoRestock, false, 'autoRestock must not be enable-able');
  try { caps.complaints = true; } catch { threw = true; }
  assert.equal(caps.complaints, false, 'complaints must not be enable-able');
  assert.equal(threw, true, 'a write attempt must be rejected, not silently accepted');
});

test('undo and prep-extension endpoints are never called by default', () => {
  // No unconditional call sites for endpoints we cannot verify.
  assert.doesNotMatch(html, /\/orders\/[^']*\/undo/);
  assert.doesNotMatch(html, /\/orders\/[^']*\/extend/);
});

test('auto-restock request is guarded by caps.autoRestock', () => {
  assert.match(html, /if \(!caps\.autoRestock\)/);
});

/* ------------------------------------------------------------------ *
 * 5. Duplicate-action protection
 * ------------------------------------------------------------------ */
test('actions that must not double-fire are guarded', () => {
  assert.match(html, /state\.actionBusy\.has\(id\)/, 'accept/advance must be idempotent per order');
  assert.match(html, /state\.reviewReplyBusy/, 'review reply must be guarded against duplicate submits');
  assert.match(html, /v2\.bulkBusy/, 'bulk stock apply must be guarded');
});

test('print root exists and is the only printable node', () => {
  assert.match(html, /id="kotPrintRoot"/);
  assert.match(theme, /body>\*:not\(#kotPrintRoot\)\{display:none/);
});
