import { dietOf, orderRef } from '@/features/orders/orderDomain';
import type { Order } from '@/types/order';

/**
 * Kitchen Order Ticket (KOT) printing. Mirrors the legacy `buildKotHtml` /
 * `printKot`: a print-only node is mounted under #kot-print-root, the browser
 * print dialog is invoked, and the node is cleared afterwards. The print
 * stylesheet hides everything else. Thermal widths are handled in CSS.
 */
function escapeHtml(str: unknown): string {
  return String(str ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

export function buildKotHtml(order: Order, restaurantName: string): string {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items
    .map((i) => {
      const d = dietOf(i);
      const mark = d === 'veg' ? '[V] ' : d === 'nonveg' ? '[N] ' : '';
      return `<li><span>${Number(i.quantity) || 1}×</span><span>${mark}${escapeHtml(i.name)}</span></li>`;
    })
    .join('');
  const note = order.restaurantNote
    ? `<div class="kot-note">Note: ${escapeHtml(order.restaurantNote)}</div>`
    : '';
  const cutlery =
    order.cutlery === true || order.cutleryRequired === true
      ? '<div class="kot-note">Cutlery requested</div>'
      : '';
  const printedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    '<div class="kot">' +
    '<h2>KOT</h2>' +
    `<div class="kot-sub">${escapeHtml(restaurantName || 'Eatswada Vendor')}</div>` +
    '<hr>' +
    `<div class="kot-row"><span>Order</span><span>#${escapeHtml(orderRef(order))}</span></div>` +
    `<div class="kot-row"><span>Time</span><span>${escapeHtml(printedAt)}</span></div>` +
    '<hr>' +
    `<ul class="kot-items">${itemsHtml || '<li>No items</li>'}</ul>` +
    '<hr>' +
    note +
    cutlery +
    '<div class="kot-foot">Kitchen copy · Eatswada</div>' +
    '</div>'
  );
}

/** Prints the ticket. Returns false when the device cannot print. */
export function printKot(order: Order, restaurantName: string): boolean {
  const root = document.getElementById('kot-print-root');
  if (!root) return false;
  root.innerHTML = buildKotHtml(order, restaurantName);
  const done = () => {
    root.innerHTML = '';
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  try {
    window.print();
    return true;
  } catch {
    done();
    return false;
  }
}
