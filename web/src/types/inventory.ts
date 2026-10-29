/** A single stock movement from GET /vendor/inventory/history. */
export interface StockMovement {
  change?: number;
  after?: number;
  reason?: string;
  createdAt?: string;
  [key: string]: unknown;
}
