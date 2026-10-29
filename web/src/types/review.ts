/**
 * Review types. Field names mirror what the legacy `reviewCardHtml` /
 * `reviewMatches` helpers read from `GET /vendor/reviews`, so the ported UI
 * tolerates the same server shape variance (nested user vs customer, score vs
 * rating) without inventing fields.
 */
export interface ReviewItemRating {
  name?: string;
  itemName?: string;
  title?: string;
  quantity?: number;
  score?: number;
  rating?: number;
  isVeg?: boolean;
  foodType?: string;
  [key: string]: unknown;
}

export interface ReviewReply {
  message?: string;
  text?: string;
  createdAt?: string;
  repliedAt?: string;
  at?: string;
}

export interface Review {
  _id?: string;
  id?: string;
  score?: number;
  rating?: number;
  comment?: string;
  createdAt?: string;
  orderNumber?: string;
  publicOrderId?: string;
  customerOrderCount?: number;
  orderCount?: number;
  user?: { name?: string; orderCount?: number };
  customer?: { name?: string; orderCount?: number };
  vendorReply?: ReviewReply | string;
  vendorReplyAt?: string;
  repliedAt?: string;
  itemRatings?: ReviewItemRating[];
  items?: ReviewItemRating[];
  dishRatings?: ReviewItemRating[];
  photos?: unknown[];
  images?: unknown[];
  attachments?: unknown[];
  [key: string]: unknown;
}

export interface ReviewSummary {
  rating?: number;
  ratingCount?: number;
  reviewCount?: number;
}

export interface ReviewsResponse {
  data?: Review[];
  summary?: ReviewSummary;
  total?: number;
}
