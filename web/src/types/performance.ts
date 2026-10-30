/**
 * Restaurant performance & ranking types. Mirror the REAL read-only route
 * `GET /vendor/performance` (vendorController.getVendorPerformance). The vendor
 * never edits weights, pins or scores; these fields are displayed as returned.
 */
export interface PerformanceFactor {
  /** ratings | completion | preparation | cancellation | complaints | repeat | recent */
  key?: string;
  label?: string;
  /** Configured weight (0–1). */
  weight?: number;
  /** Normalised 0–1 component score. */
  normalised?: number;
  /** Raw value behind the factor (shape varies per factor). */
  raw?: unknown;
  /** False when the factor had too little data (uses a neutral prior). */
  hasData?: boolean;
  [key: string]: unknown;
}

export interface PerformanceSample {
  orders?: number;
  completed?: number;
  cancelled?: number;
  reviews?: number;
  complaints?: number;
  refunds?: number;
  repeatOrders?: number;
  avgRating?: number | null;
  avgPrepMinutes?: number | null;
  lateOrders?: number;
  [key: string]: unknown;
}

export interface PerformanceAvailability {
  /** orderable | busy | temporarily_closed | closed_today | outside_hours |
   *  suspended | unapproved | inactive | unknown */
  class?: string;
  orderable?: boolean;
  reason?: string;
  label?: string;
  [key: string]: unknown;
}

export interface PerformanceRanking {
  featured?: boolean;
  pinned?: boolean;
  sponsored?: boolean;
  sponsorLabel?: string;
  [key: string]: unknown;
}

export interface PerformanceData {
  restaurantId?: string;
  name?: string;
  score?: number;
  dataConfidence?: number;
  isNewRestaurant?: boolean;
  computedAt?: string | null;
  factors?: PerformanceFactor[];
  sample?: PerformanceSample | null;
  availability?: PerformanceAvailability;
  ranking?: PerformanceRanking;
  [key: string]: unknown;
}

export interface PerformanceResponse {
  data?: PerformanceData;
}
