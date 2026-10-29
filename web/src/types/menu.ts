/** Menu item. Only fields the API actually returns are typed; stock numbers
 * are shown only when `trackStock` is true so the UI can never disagree with
 * what the server enforces (see renderMenuCard in the legacy dashboard). */
export interface MenuItem {
  _id: string;
  name: string;
  category?: string;
  price?: number;
  originalPrice?: number;
  inStock?: boolean;
  trackStock?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isVeg?: boolean;
  image?: string;
  autoTurnOnAt?: string;
  approvalStatus?: string;
  approval?: string;
  menuStatus?: string;
  moderationStatus?: string;
  status?: string;
  [key: string]: unknown;
}

export interface MenuResponse {
  data?: MenuItem[];
}
