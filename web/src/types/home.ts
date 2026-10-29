/**
 * Home dashboard types. Shapes match the mounted routes:
 *   GET /vendor/dashboard  → getVendorDashboard
 *   GET /vendor/alerts     → getVendorAlerts
 *   GET /vendor/activity   → getVendorActivity
 * (controllers/vendorMarketplaceController.js). Every field is optional so a
 * partial server payload never throws — the UI omits what is absent.
 */

export interface DashboardActivity {
  type?: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface DashboardStatusCount {
  status?: string;
  count?: number;
}

export interface VendorDashboard {
  date?: string;
  restaurant?: {
    name?: string;
    createdAt?: string;
    isOpen?: boolean;
    availability?: string;
    deliveryMode?: string;
  };
  today?: {
    orders?: number;
    sales?: number;
    averageOrderValue?: number;
    cancelled?: number;
    statusCounts?: Record<string, number>;
  };
  pendingSettlement?: number;
  alerts?: {
    menuReview?: number;
    lowStock?: number;
    outOfStock?: number;
  };
  recentActivity?: DashboardActivity[];
}

export type VendorAlertType =
  | 'menu_pending'
  | 'menu_rejected'
  | 'low_stock'
  | 'out_of_stock'
  | 'order_action'
  | string;

export interface VendorAlert {
  type?: VendorAlertType;
  entityId?: string;
  title?: string;
  message?: string;
  createdAt?: string | null;
  [key: string]: unknown;
}

export interface DashboardResponse {
  data?: VendorDashboard;
}

export interface AlertsResponse {
  data?: VendorAlert[];
}

export interface ActivityResponse {
  data?: DashboardActivity[];
}
