/**
 * Analytics types. Shapes mirror VENDOR-API-CONTRACT.md:
 *   GET /vendor/analytics        → { period, summary, statusCounts, daily, topItems, currency }
 *   GET /vendor/analytics/visits → { data: { summary, daily, byEventType } }
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

export interface AnalyticsResponse {
  period?: string;
  currency?: string;
  summary?: AnalyticsSummary;
  statusCounts?: unknown;
  daily?: AnalyticsDaily[];
  topItems?: AnalyticsTopItem[];
}

export interface VisitSummary {
  totalViews?: number;
  uniqueVisitors?: number;
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

export interface VisitsResponse {
  data?: {
    summary?: VisitSummary;
    daily?: VisitDaily[];
    byEventType?: VisitEventType[];
  };
}
