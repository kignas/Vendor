import { Star } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

/**
 * Reviews. The vendor reviews list (GET /reviews) exists, but reply/complaint
 * flows depend on routes that are not part of the verified contract used by the
 * core migration; this screen is a placeholder stating the current state rather
 * than simulating data.
 */
export function ReviewsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Reviews</h1>
      <EmptyState
        title="Customer reviews"
        description="Reviews and rating trends will appear here. Replies and complaints require backend routes that are not mounted yet."
        icon={Star}
      />
    </section>
  );
}
