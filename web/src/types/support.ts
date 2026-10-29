/**
 * Support ticket types. Shapes mirror the legacy `loadSupport` reader, which
 * tolerates `res.data`, `res.data.tickets` and `res.tickets`.
 */
export interface SupportMessage {
  message?: string;
  body?: string;
  [key: string]: unknown;
}

export interface SupportTicket {
  _id?: string;
  id?: string;
  subject?: string;
  title?: string;
  category?: string;
  priority?: string;
  status?: string;
  message?: string;
  description?: string;
  createdAt?: string;
  messages?: SupportMessage[];
  replies?: SupportMessage[];
  [key: string]: unknown;
}

export interface SupportResponse {
  data?: SupportTicket[] | { tickets?: SupportTicket[] };
  tickets?: SupportTicket[];
}
