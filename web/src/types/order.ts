/**
 * Order types. The backend order document is wide and evolves, so the shape is
 * intentionally permissive: known fields are typed, and an index signature
 * admits server fields we render defensively (never invent). Field names mirror
 * the legacy dashboard so the ported mapping reads identically.
 * See docs/rebuild/PORTING_MAP.md §1c.
 */

export interface OrderItem {
  name?: string;
  quantity?: number;
  isVeg?: boolean;
  veg?: boolean;
  foodType?: string;
  dietaryType?: string;
  dietType?: string;
  variant?: string;
  size?: string;
  variantName?: string;
  portion?: string;
  /* Price aliases read by `itemPriceOf`. The order-item shape is not pinned
     down by VENDOR-API-CONTRACT.md, so every candidate is optional. */
  price?: number;
  unitPrice?: number;
  itemPrice?: number;
  rate?: number;
  amount?: number;
  qty?: number;
  itemTotal?: number;
  totalPrice?: number;
  lineTotal?: number;
  totalAmount?: number;
  addons?: unknown;
  options?: unknown;
  customizations?: unknown;
  customisation?: unknown;
  note?: string;
  instructions?: string;
  [key: string]: unknown;
}

export interface OrderRider {
  name?: string;
  fullName?: string;
  phone?: string;
  mobile?: string;
}

export interface Order {
  _id: string;
  /** Server-owned status string. Rendered raw, never remapped (AGENTS.md rule 3). */
  status: string;
  publicOrderId?: string;
  orderNumber?: string;
  publicShipmentId?: string;
  shipmentId?: string;
  createdAt?: string;
  acceptedAt?: string;
  updatedAt?: string;
  estimatedReadyAt?: string;
  prepReadyAt?: string;
  readyAt?: string;
  restaurantResponseDeadline?: string;
  items?: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  user?: { name?: string; _id?: string };
  customer?: { name?: string; orderCount?: number };
  deliveryAddress?: DeliveryAddress;
  restaurantNote?: string;
  total?: number;
  grandTotal?: number;
  amount?: number;
  cancelReason?: string;
  isFoodReady?: boolean;
  isPaid?: boolean;
  paid?: boolean;
  paymentMode?: string;
  paymentMethod?: string;
  paymentType?: string;
  paymentStatus?: string;
  payment?: { mode?: string; method?: string };
  pickupCode?: string;
  pickupOtp?: string;
  deliveryOtp?: string;
  prepTimeExtended?: boolean;
  deliveryModeSnapshot?: string;
  rider?: OrderRider;
  deliveryPartner?: OrderRider;
  deliveryBoy?: OrderRider;
  riderName?: string;
  riderPhone?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  riderStatus?: string;
  deliveryRiderStatus?: string;
  riderState?: string;
  riderEtaMinutes?: number;
  etaMinutes?: number;
  riderEta?: number;
  arrivingInMinutes?: number;
  reachedRestaurantAt?: string;
  riderReachedAt?: string;
  riderArrivedAt?: string;
  riderArrived?: boolean;
  riderAtRestaurant?: boolean;
  riderReached?: boolean;
  riderDispatchAt?: string;
  scheduledAt?: string;
  scheduledFor?: string;
  deliverySlotAt?: string;
  deliverySlot?: { startAt?: string };
  scheduledDispatchAt?: string;
  dispatchScheduledAt?: string;
  customerOrderCount?: number;
  userOrderCount?: number;
  orderCountWithRestaurant?: number;
  sendCutlery?: boolean;
  cutlery?: boolean | string;
  cutleryPreference?: string;
  cutleryRequired?: boolean;
  customerInstructions?: string;
  instructions?: string;
  deliveryInstructions?: string;
  vendorBill?: Record<string, unknown>;
  settlement?: Record<string, unknown>;
  billBreakdown?: Record<string, unknown>;
  bill?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  netVendorPayout?: number | Record<string, unknown>;
  [key: string]: unknown;
}

export interface DeliveryAddress {
  tag?: string;
  house?: string;
  line1?: string;
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  [key: string]: unknown;
}

export interface OrdersQueueResponse {
  data?: Order[];
}

export interface OrdersHistoryResponse {
  data?: Order[];
  currentPage?: number;
  totalPages?: number;
  totalOrders?: number;
}

/** Order statuses the UI recognises for its tab/CTA logic. Rendered raw. */
export const ORDER_STATUS = {
  placed: 'placed',
  confirmed: 'confirmed',
  preparing: 'preparing',
  waitingForRider: 'waiting_for_rider',
  assigned: 'assigned',
  outForDelivery: 'out_for_delivery',
  otpVerified: 'otp_verified',
  delivered: 'delivered',
  cancelled: 'cancelled',
} as const;

export type OrderTab = 'new' | 'preparing' | 'ready' | 'dispatch' | 'scheduled' | 'history';
