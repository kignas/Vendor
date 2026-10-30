/**
 * Analytics types. Shapes mirror the REAL backend routes (VENDOR-API-CONTRACT.md
 * and docs/rebuild/ANALYTICS_REDESIGN_AUDIT.md):
 *
 *   GET /vendor/analytics        -> { data: { period, summary, statusCounts, daily, topItems, currency } }
 *   GET /vendor/analytics/visits -> { data: { period, range, summary, comparison, daily, byEventType, topItems, mostViewedItems } }
 *
 * Every field is optional and read defensively: the endpoints have grown over
 * time and an older backend must still render (missing metric = absent, never 0).
 */

export interface AnalyticsSummary {
  totalOrders?: number;
  deliveredOrders?: number;
  cancelledOrders?: number;
  deliveredFoodSales?: number;
  averageDeliveredOrderValue?: number;
  [key: string]: unknown;
}

export interface AnalyticsDaily {
  date?: string;
  day?: string;
  _id?: string;
  orders?: number;
  count?: number;
  deliveredSales?: number;
  sales?: number;
  [key: string]: unknown;
}

export interface AnalyticsTopItem {
  name?: string;
  itemName?: string;
  _id?: string;
  quantity?: number;
  count?: number;
  sales?: number;
  [key: string]: unknown;
}

export interface AnalyticsStatusCount {
  status?: string;
  count?: number;
  [key: string]: unknown;
}

export interface AnalyticsResponse {
  period?: string;
  currency?: string;
  summary?: AnalyticsSummary;
  statusCounts?: AnalyticsStatusCount[];
  daily?: AnalyticsDaily[];
  topItems?: AnalyticsTopItem[];
}

/** One most-viewed menu item row from `/analytics/visits`. */
export interface VisitItemRow {
  menuItemId?: string;
  name?: string;
  price?: number | null;
  views?: number;
  addToCart?: number;
  /** Item engagement = add-to-cart / item views x 100 (backend-computed). */
  engagement?: number;
  [key: string]: unknown;
}

export interface VisitSummary {
  totalViews?: number;
  uniqueVisitors?: number;
  today?: { views?: number; uniqueVisitors?: number };
  week?: { views?: number; uniqueVisitors?: number };
  month?: { views?: number; uniqueVisitors?: number };
  itemViews?: number;
  addToCart?: number;
  removeFromCart?: number;
  checkoutInitiated?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  refunds?: number;
  /** Conversion = completed attributed orders / unique menu visitors x 100. */
  conversionRate?: number;
  revenue?: number;
  averageOrderValue?: number;
  attribution?: { windowHours?: number };
  [key: string]: unknown;
}

export interface VisitComparison {
  previous?: {
    totalViews?: number;
    uniqueVisitors?: number;
    completedOrders?: number;
    conversionRate?: number;
  };
  viewsChangePct?: number;
  uniqueVisitorsChangePct?: number;
  completedOrdersChangePct?: number;
  conversionRateChangePct?: number;
  [key: string]: unknown;
}

export interface VisitDaily {
  day?: string;
  views?: number;
  uniqueVisitors?: number;
  [key: string]: unknown;
}

export interface VisitEventType {
  eventType?: string;
  count?: number;
  [key: string]: unknown;
}

export interface VisitsData {
  period?: string;
  range?: { from?: string; to?: string };
  summary?: VisitSummary;
  comparison?: VisitComparison;
  daily?: VisitDaily[];
  byEventType?: VisitEventType[];
  topItems?: VisitItemRow[];
  mostViewedItems?: VisitItemRow[];
}

export interface VisitsResponse {
  data?: VisitsData;
}
