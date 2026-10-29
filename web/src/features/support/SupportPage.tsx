import { useState } from 'react';
import { LifeBuoy, MessageSquarePlus, Send } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { BottomSheet } from '@/components/BottomSheet';
import { SkeletonList } from '@/components/Skeletons';
import { StatusPill } from '@/components/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateTicket, useReplyToTicket, useSupportTickets } from '@/hooks/useSupport';
import { enumLabel } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { SupportTicket } from '@/types/support';

/**
 * Ticket categories the backend accepts. POST /vendor/support silently coerces
 * any other value to 'other' (`createVendorSupportTicket`), so the app must
 * offer exactly this list or the vendor's choice would be discarded.
 */
const CATEGORIES = [
  'payment',
  'order',
  'delivery',
  'customer_complaint',
  'technical',
  'account',
  'document',
  'policy',
  'other',
];

function ticketId(t: SupportTicket): string {
  return String(t._id ?? t.id ?? '');
}

/** Ticket status -> pill tone. Mirrors the legacy `cls` mapping. */
function statusTone(status: string): 'success' | 'warning' | 'neutral' {
  const s = status.toLowerCase();
  if (/closed|resolved/.test(s)) return 'success';
  if (/open|pending|in_progress|in-progress/.test(s)) return 'warning';
  return 'neutral';
}

function TicketRow({ ticket, onReply }: { ticket: SupportTicket; onReply: (t: SupportTicket) => void }) {
  const id = ticketId(ticket);
  const status = ticket.status || 'open';
  const msgs = Array.isArray(ticket.messages)
    ? ticket.messages
    : Array.isArray(ticket.replies)
      ? ticket.replies
      : [];

  return (
    <article className="rounded-card border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {ticket.subject || ticket.title || 'Ticket'}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {enumLabel(ticket.category || 'general')}
            {id ? ` · ${id}` : ''}
          </p>
        </div>
        <StatusPill tone={statusTone(status)} dot>
          {enumLabel(status)}
        </StatusPill>
      </div>

      {ticket.message || ticket.description ? (
        <p className="mt-2 text-sm text-ink-soft">{ticket.message || ticket.description}</p>
      ) : null}

      {msgs.map((m, i) => (
        <p key={i} className="mt-2 border-l-2 border-border pl-2.5 text-xs text-ink-soft">
          {m.message || m.body || ''}
        </p>
      ))}

      {id ? (
        <button
          type="button"
          onClick={() => onReply(ticket)}
          className="mt-3 inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-brand-ink"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          Reply
        </button>
      ) : null}
    </article>
  );
}

function NewTicketSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [message, setMessage] = useState('');
  const create = useCreateTicket();

  async function submit() {
    if (!subject.trim() || !message.trim()) return;
    await create.mutateAsync({ subject: subject.trim(), category, message: message.trim() });
    setSubject('');
    setCategory('other');
    setMessage('');
    onClose();
  }

  return (
    <BottomSheet open={open} onOpenChange={(o) => !o && onClose()} title="New support ticket">
      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="sup-subject" className="text-xs font-semibold text-ink">
            Subject
          </label>
          <Input
            id="sup-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="sup-category" className="text-xs font-semibold text-ink">
            Category
          </label>
          <select
            id="sup-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 w-full rounded-btn border border-border bg-card px-3 text-sm text-ink"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {enumLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="sup-message" className="text-xs font-semibold text-ink">
            Description
          </label>
          <textarea
            id="sup-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-btn border border-border bg-card p-3 text-sm text-ink outline-none focus-visible:border-brand-ink"
            placeholder="Describe the issue"
          />
        </div>
        <Button
          variant="brand"
          onClick={() => void submit()}
          disabled={create.isPending || !subject.trim() || !message.trim()}
          className="w-full"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {create.isPending ? 'Submitting…' : 'Submit ticket'}
        </Button>
        {create.isError ? (
          <p className="text-xs text-danger-ink" role="alert">
            Could not submit the ticket. Please try again.
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

function ReplySheet({ ticket, onClose }: { ticket: SupportTicket | null; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const reply = useReplyToTicket();

  async function submit() {
    if (!ticket || !message.trim()) return;
    await reply.mutateAsync({ id: ticketId(ticket), message: message.trim() });
    setMessage('');
    onClose();
  }

  return (
    <BottomSheet
      open={ticket !== null}
      onOpenChange={(o) => !o && onClose()}
      title={ticket?.subject ? `Reply to “${ticket.subject}”` : 'Reply'}
    >
      <div className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          aria-label="Message"
          className="w-full rounded-btn border border-border bg-card p-3 text-sm text-ink outline-none focus-visible:border-brand-ink"
          placeholder="Add a message to this ticket"
        />
        <Button
          variant="brand"
          onClick={() => void submit()}
          disabled={reply.isPending || !message.trim()}
          className="w-full"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {reply.isPending ? 'Sending…' : 'Send reply'}
        </Button>
        {reply.isError ? (
          <p className="text-xs text-danger-ink" role="alert">
            Could not send the reply.
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

/**
 * Support. Lists the vendor's own tickets (GET /vendor/support), creates new
 * ones (POST /vendor/support) and replies (POST /vendor/support/:id/reply).
 */
export function SupportPage() {
  const tickets = useSupportTickets();
  const [newOpen, setNewOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<SupportTicket | null>(null);

  const rows = tickets.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-ink">Help &amp; Support</h1>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-brand-ink"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          New ticket
        </button>
      </div>

      {tickets.isLoading ? <SkeletonList rows={3} /> : null}

      {tickets.isError ? (
        <ErrorState
          message="Could not load tickets."
          onRetry={() => void tickets.refetch()}
          retrying={tickets.isFetching}
        />
      ) : null}

      {tickets.isSuccess && rows.length === 0 ? (
        <EmptyState
          title="No support tickets"
          description="Create a ticket and the Eatswada team will respond here."
          icon={LifeBuoy}
          action={
            <Button variant="brand" onClick={() => setNewOpen(true)}>
              Create a ticket
            </Button>
          }
        />
      ) : null}

      <div className={cn('space-y-3')}>
        {rows.map((ticket, i) => (
          <TicketRow key={ticketId(ticket) || i} ticket={ticket} onReply={setReplyTo} />
        ))}
      </div>

      <NewTicketSheet open={newOpen} onClose={() => setNewOpen(false)} />
      <ReplySheet ticket={replyTo} onClose={() => setReplyTo(null)} />
    </section>
  );
}
