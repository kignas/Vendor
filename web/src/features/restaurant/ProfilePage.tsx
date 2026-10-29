import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { SkeletonList } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePolicies, useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useRestaurant, type OpeningHours } from '@/hooks/useRestaurant';
import { enumLabel } from '@/lib/format';
import { toast } from 'sonner';
import type { VendorProfile } from '@/services/api/restaurant';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function formatAddress(addr: VendorProfile['address']): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const a = addr as Record<string, unknown>;
  return [a.tag, a.house, a.line1, a.street, a.area, a.landmark ? `Near ${a.landmark}` : '', a.city, a.pincode]
    .filter(Boolean)
    .join(', ');
}

function Row({ label, value, admin }: { label: string; value: string; admin?: boolean }) {
  return (
    <div className="border-b border-border-soft py-2.5 last:border-b-0">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-faint">
        {label}
        {admin ? ' · admin-managed' : ''}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value || '—'}</p>
    </div>
  );
}

function EditSheet({
  profile,
  open,
  onClose,
}: {
  profile: VendorProfile;
  open: boolean;
  onClose: () => void;
}) {
  const update = useUpdateProfile();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    if (open) {
      setName(profile.name ?? '');
      setPhone(String(profile.phone ?? profile.contactNumber ?? ''));
      setCuisine(Array.isArray(profile.cuisine) ? profile.cuisine.join(', ') : String(profile.cuisine ?? ''));
      setAddress(formatAddress(profile.address));
      setDescription(String(profile.description ?? ''));
      setImage(String(profile.image ?? ''));
    }
  }, [open, profile]);

  async function save() {
    if (!name.trim()) {
      toast.error('Restaurant name is required.');
      return;
    }
    try {
      await update.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        cuisine: cuisine
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        address: address.trim(),
        description: description.trim(),
        image: image.trim(),
      });
      toast.success('Profile updated.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the profile.');
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={(o) => !o && onClose()} title="Edit profile">
      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="pf-name" className="text-xs font-semibold text-ink">
            Restaurant name *
          </label>
          <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="pf-phone" className="text-xs font-semibold text-ink">
            Phone
          </label>
          <Input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="pf-cuisine" className="text-xs font-semibold text-ink">
            Cuisine (comma separated)
          </label>
          <Input id="pf-cuisine" value={cuisine} onChange={(e) => setCuisine(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="pf-address" className="text-xs font-semibold text-ink">
            Address
          </label>
          <Input id="pf-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="pf-desc" className="text-xs font-semibold text-ink">
            Description
          </label>
          <textarea
            id="pf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-btn border border-border bg-card p-3 text-sm text-ink outline-none focus-visible:border-brand"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="pf-image" className="text-xs font-semibold text-ink">
            Cover image URL
          </label>
          <Input id="pf-image" value={image} onChange={(e) => setImage(e.target.value)} />
        </div>
        <Button variant="brand" onClick={() => void save()} disabled={update.isPending} className="w-full">
          {update.isPending ? 'Saving…' : 'Save profile'}
        </Button>
        <p className="text-xs text-ink-faint">
          Commission, verification and ranking are managed by Eatswada admin.
        </p>
      </div>
    </BottomSheet>
  );
}

function buildDraft(hours?: OpeningHours): Record<string, Required<OpeningHours[string]>> {
  const out: Record<string, { closed: boolean; opensAt: string; closesAt: string }> = {};
  for (const day of DAYS) {
    const d = hours?.[day] ?? {};
    out[day] = { closed: !!d.closed, opensAt: d.opensAt || '10:00', closesAt: d.closesAt || '22:00' };
  }
  return out;
}

function OpeningHoursEditor({ hours }: { hours?: OpeningHours | undefined }) {
  const restaurant = useRestaurant();
  const [draft, setDraft] = useState(() => buildDraft(hours));

  useEffect(() => {
    setDraft(buildDraft(hours));
  }, [hours]);

  function setDay(day: string, patch: Partial<{ closed: boolean; opensAt: string; closesAt: string }>) {
    setDraft((d) => ({ ...d, [day]: { ...d[day], ...patch } }));
  }

  async function save() {
    try {
      await restaurant.hoursMutation.mutateAsync(draft);
      toast.success('Business hours saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save hours.');
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {DAYS.map((day) => {
        const d = draft[day];
        return (
          <div key={day} className="flex flex-wrap items-center gap-2">
            <span className="w-10 text-xs font-bold uppercase text-ink-soft">{day.slice(0, 3)}</span>
            <label className="flex items-center gap-1 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={!!d.closed}
                onChange={(e) => setDay(day, { closed: e.target.checked })}
                aria-label={`${day} closed`}
              />
              Closed
            </label>
            <input
              type="time"
              value={d.opensAt}
              disabled={d.closed}
              onChange={(e) => setDay(day, { opensAt: e.target.value })}
              aria-label={`${day} opens at`}
              className="h-9 rounded-btn border border-border bg-card px-2 text-xs text-ink disabled:opacity-50"
            />
            <span className="text-ink-faint">–</span>
            <input
              type="time"
              value={d.closesAt}
              disabled={d.closed}
              onChange={(e) => setDay(day, { closesAt: e.target.value })}
              aria-label={`${day} closes at`}
              className="h-9 rounded-btn border border-border bg-card px-2 text-xs text-ink disabled:opacity-50"
            />
          </div>
        );
      })}
      <Button variant="secondary" onClick={() => void save()} disabled={restaurant.hoursMutation.isPending}>
        {restaurant.hoursMutation.isPending ? 'Saving…' : 'Save hours'}
      </Button>
    </div>
  );
}

/**
 * Restaurant profile. GET /vendor/profile (read-only) with a /restaurant
 * fallback; editing writes the vendor allow-list via PUT /restaurant/profile.
 * Opening hours are edited on the same screen via PUT /restaurant/hours.
 */
export function ProfilePage() {
  const profile = useProfile();
  const policies = usePolicies();
  const [editOpen, setEditOpen] = useState(false);

  const r = profile.data ?? {};
  const cuisine = Array.isArray(r.cuisine) ? r.cuisine.join(', ') : String(r.cuisine ?? '');
  const joined = r.createdAt ?? r.joinedAt;

  const policyBits: string[] = [];
  const pol = (r.policies && typeof r.policies === 'object' ? r.policies : {}) as Record<string, unknown>;
  if (pol.privacyPolicyUrl) policyBits.push('Privacy policy');
  if (pol.termsUrl) policyBits.push('Terms of service');
  const versions = policies.data
    ? Object.keys(policies.data)
        .filter((k) => k !== 'note' && policies.data?.[k])
        .map((k) => `${enumLabel(k)} ${String(policies.data?.[k])}`)
    : [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-ink">Restaurant profile</h1>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
      </div>

      {profile.isLoading ? <SkeletonList rows={4} /> : null}

      {profile.isSuccess ? (
        <>
          <div className="rounded-card border border-border bg-card px-4 py-1">
            <Row label="Restaurant name" value={String(r.name ?? '')} />
            <Row label="Business type" value={enumLabel(r.businessType ?? '')} />
            <Row label="Cuisine" value={cuisine} />
            <Row label="Description" value={String(r.description ?? '')} />
            <Row label="Phone" value={String(r.phone ?? r.contactNumber ?? '')} />
            <Row label="Address" value={formatAddress(r.address)} />
            <Row label="FSSAI number" value={String(r.fssaiLicenseNumber ?? '')} />
            <Row label="FSSAI verification" value={enumLabel(r.fssaiVerificationStatus ?? 'pending')} />
            <Row label="Approval status" value={enumLabel(r.approvalStatus ?? '')} />
            <Row
              label="Delivery mode"
              value={
                r.deliveryMode === 'self_delivery'
                  ? 'Self delivery'
                  : r.deliveryMode === 'eatswada_rider'
                    ? 'Eatswada delivery'
                    : ''
              }
            />
            <Row
              label="Commission rate"
              value={r.commissionRate != null ? `${r.commissionRate}%` : ''}
              admin
            />
            <Row label="Settlement schedule" value={enumLabel(r.settlementSchedule ?? '')} admin />
            <Row
              label="Joined"
              value={
                joined
                  ? new Date(joined).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : ''
              }
              admin
            />
          </div>

          <div className="rounded-card border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-ink">Operating hours</h2>
            <OpeningHoursEditor hours={r.openingHours as OpeningHours | undefined} />
          </div>

          {policyBits.length || versions.length ? (
            <p className="text-xs text-ink-faint">
              {policyBits.length ? `Policies: ${policyBits.join(' · ')}. ` : ''}
              {versions.length ? `Accepted versions: ${versions.join(' · ')}.` : ''}
            </p>
          ) : null}
        </>
      ) : null}

      <EditSheet profile={r} open={editOpen} onClose={() => setEditOpen(false)} />
    </section>
  );
}
