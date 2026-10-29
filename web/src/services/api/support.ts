/**
 * Support endpoint module. Paths exist in VENDOR-API-CONTRACT.md
 * (`GET/POST /vendor/support`, `POST /vendor/support/:id/reply`).
 */
import { apiFetch } from '@/lib/api';
import type { SupportResponse, SupportTicket } from '@/types/support';

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const res = await apiFetch<SupportResponse>('/support');
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { tickets?: SupportTicket[] }).tickets)) {
    return (data as { tickets: SupportTicket[] }).tickets;
  }
  if (Array.isArray(res?.tickets)) return res.tickets;
  return [];
}

export interface CreateTicketInput {
  subject: string;
  message: string;
  category?: string;
  priority?: string;
  orderId?: string;
}

/** POST /support — creates a ticket server-side. */
export function createTicket(input: CreateTicketInput): Promise<unknown> {
  return apiFetch('/support', { method: 'POST', body: input });
}

/** POST /support/:id/reply — body { message }. */
export function replyToTicket(id: string, message: string): Promise<unknown> {
  return apiFetch(`/support/${id}/reply`, { method: 'POST', body: { message } });
}
