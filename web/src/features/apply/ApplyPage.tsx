import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { submitApplication } from '@/services/api/applications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import type { ApplicationDraft } from '@/types/application';

const DAYS: [string, string][] = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
];

const DRAFT_KEY = 'eatswada_vendor_application_draft_v1';
const APPLICATION_ID_KEY = 'eatswada_vendor_application_id';
const STATUS_TOKEN_KEY = 'eatswada_vendor_application_status_token';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{7,15}$/;
const TOTAL_STEPS = 8;

type Hours = Record<string, { closed: boolean; opensAt: string; closesAt: string }>;

function defaultHours(): Hours {
  const out: Hours = {};
  for (const [key] of DAYS) out[key] = { closed: false, opensAt: '10:00', closesAt: '22:00' };
  return out;
}

interface Fields {
  ownerName: string;
  phone: string;
  email: string;
  restaurantName: string;
  password: string;
  cuisine: string;
  address: string;
  description: string;
  longitude: string;
  latitude: string;
  fssai: string;
}

const EMPTY: Fields = {
  ownerName: '',
  phone: '',
  email: '',
  restaurantName: '',
  password: '',
  cuisine: '',
  address: '',
  description: '',
  longitude: '',
  latitude: '',
  fssai: '',
};

/**
 * Vendor application wizard. Mirrors apply.html: 8 steps, a non-password local
 * correction draft (eatswada_vendor_application_draft_v1), GPS capture, and
 * POST /vendor-applications. On success it stores the reference id + status
 * token in sessionStorage for the status page.
 */
export function ApplyPage() {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [businessType, setBusinessType] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [hours, setHours] = useState<Hours>(defaultHours);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedDelivery, setAgreedDelivery] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string | undefined } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as ApplicationDraft;
      setFields((prev) => ({ ...prev, ...pickDraft(d) }));
      if (d.businessType) setBusinessType(d.businessType);
      if (d.deliveryMode) setDeliveryMode(d.deliveryMode);
      if (d.hours) {
        setHours((prev) => {
          const next = { ...prev };
          for (const [k] of DAYS) {
            const h = d.hours?.[k];
            if (h) {
              next[k] = {
                closed: !!h.closed,
                opensAt: h.opensAt || '10:00',
                closesAt: h.closesAt || '22:00',
              };
            }
          }
          return next;
        });
      }
    } catch {
      /* ignore invalid draft */
    }
  }, []);

  function saveDraft(next: Partial<ApplicationDraft>) {
    try {
      const current = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') as ApplicationDraft;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...next }));
    } catch {
      /* storage may be disabled; the form stays usable */
    }
  }

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    saveDraft({ [key]: value } as Partial<ApplicationDraft>);
  }

  function validate(target: number): boolean {
    setMessage(null);
    if (target === 1) {
      if (
        !fields.ownerName ||
        !PHONE_RE.test(fields.phone) ||
        !EMAIL_RE.test(fields.email) ||
        !fields.restaurantName ||
        fields.password.length < 10
      ) {
        setMessage({ text: 'Please fix the highlighted fields to continue.', type: 'error' });
        return false;
      }
    } else if (target === 2) {
      const lon = Number(fields.longitude);
      const lat = Number(fields.latitude);
      if (
        !fields.cuisine ||
        !fields.address ||
        !Number.isFinite(lon) ||
        !Number.isFinite(lat) ||
        lon < -180 ||
        lon > 180 ||
        lat < -90 ||
        lat > 90
      ) {
        setMessage({ text: 'Please fix the highlighted fields to continue.', type: 'error' });
        return false;
      }
    } else if (target === 3) {
      if (!fields.fssai) {
        setMessage({ text: 'Please fix the highlighted fields to continue.', type: 'error' });
        return false;
      }
    } else if (target === 4) {
      if (!deliveryMode) {
        setMessage({ text: 'Choose a delivery method to continue.', type: 'error' });
        return false;
      }
    } else if (target === 5) {
      for (const [key] of DAYS) {
        const h = hours[key];
        if (!h.closed && h.opensAt === h.closesAt) {
          setMessage({
            text: `Opening and closing time cannot be the same on ${key}.`,
            type: 'error',
          });
          return false;
        }
      }
    } else if (target === 6) {
      if (!(agreedTerms && agreedDelivery)) {
        setMessage({ text: 'Please accept all terms to continue.', type: 'error' });
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function useLocation() {
    if (!('geolocation' in navigator)) {
      setMessage({ text: 'Location is not supported by this browser.', type: 'error' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lon = pos.coords.longitude.toFixed(6);
        const lat = pos.coords.latitude.toFixed(6);
        setFields((prev) => ({ ...prev, longitude: lon, latitude: lat }));
        saveDraft({ longitude: lon, latitude: lat });
        setMessage({
          text: `Restaurant location captured (±${Math.round(pos.coords.accuracy || 0)} m). Verify you are at the restaurant before submitting.`,
          type: 'success',
        });
      },
      (err) => {
        setMessage({
          text:
            err.code === 1
              ? 'Location permission was denied. Allow it in browser settings and try again.'
              : err.code === 3
                ? 'Location request timed out. Please try again.'
                : 'Could not determine your location. Please try again.',
          type: 'error',
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || submitted) return;
    if (!validate(TOTAL_STEPS - 1)) return;
    setBusy(true);
    setMessage({ text: 'Submitting application…', type: 'success' });
    try {
      const result = await submitApplication({
        ownerName: fields.ownerName,
        email: fields.email,
        phone: fields.phone,
        password: fields.password,
        restaurantName: fields.restaurantName,
        cuisine: fields.cuisine,
        description: fields.description,
        address: fields.address,
        fssaiLicenseNumber: fields.fssai,
        deliveryMode: deliveryMode === 'self' ? 'self_delivery' : 'eatswada_rider',
        openingHours: hours,
        location: {
          type: 'Point',
          coordinates: [Number(fields.longitude), Number(fields.latitude)],
        },
      });
      if (result.id) sessionStorage.setItem(APPLICATION_ID_KEY, result.id);
      if (result.statusToken) sessionStorage.setItem(STATUS_TOKEN_KEY, result.statusToken);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setSubmitted({ id: result.id });
      setMessage({ text: 'Your application is pending admin review.', type: 'success' });
    } catch (err) {
      setMessage({
        text:
          err instanceof Error
            ? err.message
            : 'Could not submit the application. Please try again.',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="app-column safe-x [--page-x:1.25rem] min-h-dvh py-10">
        <h1 className="text-xl font-extrabold text-ink">Application submitted</h1>
        <div className="mt-4 rounded-card border border-border bg-card p-5">
          <p className="text-sm text-ink">
            Reference ID: <span className="font-mono">{submitted.id || '—'}</span>
          </p>
          <p className="mt-3 inline-flex rounded-pill bg-warning-bg px-2.5 py-1 text-xs font-bold text-warning-ink">
            PENDING REVIEW
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Save this page or check progress anytime on the status page.
          </p>
        </div>
        <Link
          to="/application-status"
          className="mt-5 inline-flex min-h-tap w-full items-center justify-center rounded-btn bg-brand text-sm font-bold text-white"
        >
          Check application status
        </Link>
      </div>
    );
  }

  return (
    <div className="app-column safe-x [--page-x:1.25rem] min-h-dvh py-8">
      <div className="mb-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-brand-ink">
          Eatswada Partner
        </p>
        <h1 className="mt-1 text-xl font-extrabold text-ink">Become a vendor</h1>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-ink-soft">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-pill bg-border-soft">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {message ? (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={cn(
            'mb-3 rounded-btn px-3 py-2 text-sm font-medium',
            message.type === 'error' ? 'bg-danger-bg text-danger-ink' : 'bg-success-bg text-success-ink',
          )}
        >
          {message.text}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {step === 0 ? (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">Business type</h2>
            {[
              {
                v: 'restaurant',
                t: 'Restaurant',
                d: 'Dine-in or takeaway kitchen with a physical storefront.',
              },
              {
                v: 'cloud_kitchen',
                t: 'Cloud Kitchen',
                d: 'Delivery-only kitchen with no customer seating.',
              },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={businessType === o.v}
                onClick={() => {
                  setBusinessType(o.v);
                  saveDraft({ businessType: o.v });
                }}
                className={cn(
                  'w-full rounded-card border p-4 text-left',
                  businessType === o.v ? 'border-brand-ink bg-brand/5' : 'border-border',
                )}
              >
                <span className="block text-sm font-bold text-ink">{o.t}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{o.d}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">Owner information</h2>
            <Field
              label="Owner name *"
              value={fields.ownerName}
              onChange={(v) => set('ownerName', v)}
              autoComplete="name"
            />
            <Field
              label="Mobile number *"
              value={fields.phone}
              onChange={(v) => set('phone', v)}
              inputMode="tel"
              autoComplete="tel"
            />
            <Field
              label="Email *"
              value={fields.email}
              onChange={(v) => set('email', v)}
              type="email"
              autoComplete="email"
            />
            <Field
              label="Business name *"
              value={fields.restaurantName}
              onChange={(v) => set('restaurantName', v)}
            />
            <Field
              label="Password *"
              value={fields.password}
              onChange={(v) => set('password', v)}
              type="password"
              autoComplete="new-password"
              hint="At least 10 characters. You'll use this to sign in after approval."
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">Business information</h2>
            <Field label="Cuisine *" value={fields.cuisine} onChange={(v) => set('cuisine', v)} />
            <Field label="Business address *" value={fields.address} onChange={(v) => set('address', v)} />
            <div className="space-y-1">
              <label htmlFor="description" className="text-sm font-semibold text-ink">
                Business description
              </label>
              <textarea
                id="description"
                rows={3}
                maxLength={1000}
                value={fields.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink focus:border-brand-ink"
              />
            </div>
            <div>
              <Button type="button" variant="secondary" onClick={useLocation}>
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Use my current location
              </Button>
              <p className="mt-1 text-xs text-ink-soft">
                Stand at the restaurant when using GPS. Coordinates are required for
                delivery-distance calculations.
              </p>
            </div>
            <Field label="Longitude" value={fields.longitude} onChange={() => undefined} readOnly />
            <Field label="Latitude" value={fields.latitude} onChange={() => undefined} readOnly />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">Legal verification</h2>
            <p className="rounded-btn bg-warning-bg px-3 py-2 text-xs text-warning-ink">
              Verification is manual. Eatswada reviews your FSSAI number during admin approval. No
              certificate upload is required at this stage.
            </p>
            <Field
              label="FSSAI license / registration number *"
              value={fields.fssai}
              onChange={(v) => set('fssai', v)}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">Delivery configuration</h2>
            {[
              { v: 'self', t: 'Self delivery', d: 'Your restaurant handles delivery.' },
              { v: 'eatswada', t: 'Eatswada delivery', d: 'An Eatswada rider handles delivery.' },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={deliveryMode === o.v}
                onClick={() => {
                  setDeliveryMode(o.v);
                  saveDraft({ deliveryMode: o.v });
                }}
                className={cn(
                  'w-full rounded-card border p-4 text-left',
                  deliveryMode === o.v ? 'border-brand-ink bg-brand/5' : 'border-border',
                )}
              >
                <span className="block text-sm font-bold text-ink">{o.t}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{o.d}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">Restaurant configuration</h2>
            <p className="rounded-btn bg-border-soft px-3 py-2 text-xs text-ink-soft">
              Preparation time, maximum active orders, delivery radius and delivery availability are
              managed by Eatswada during onboarding.
            </p>
            {DAYS.map(([key, label]) => (
              <div key={key} className="rounded-card border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{label}</span>
                  <label className="flex items-center gap-2 text-xs text-ink-soft">
                    <input
                      type="checkbox"
                      checked={hours[key].closed}
                      onChange={(e) =>
                        setHours((h) => ({ ...h, [key]: { ...h[key], closed: e.target.checked } }))
                      }
                      aria-label={`${label} closed`}
                    />
                    Closed
                  </label>
                </div>
                <div className="mt-2 flex gap-3">
                  <label className="flex flex-1 flex-col gap-1 text-xs text-ink-soft">
                    Opens
                    <input
                      type="time"
                      value={hours[key].opensAt}
                      disabled={hours[key].closed}
                      onChange={(e) =>
                        setHours((h) => ({ ...h, [key]: { ...h[key], opensAt: e.target.value } }))
                      }
                      className="min-h-tap rounded-btn border border-border bg-card px-2 text-sm text-ink"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-xs text-ink-soft">
                    Closes
                    <input
                      type="time"
                      value={hours[key].closesAt}
                      disabled={hours[key].closed}
                      onChange={(e) =>
                        setHours((h) => ({ ...h, [key]: { ...h[key], closesAt: e.target.value } }))
                      }
                      className="min-h-tap rounded-btn border border-border bg-card px-2 text-sm text-ink"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">Vendor agreement</h2>
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-1"
              />
              <span>I accept the Vendor Agreement and the Privacy Policy.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={agreedDelivery}
                onChange={(e) => setAgreedDelivery(e.target.checked)}
                className="mt-1"
              />
              <span>
                I accept responsibility for order preparation and, where I choose self delivery, for
                delivering orders on time. Settlement and payout terms are set by Eatswada.
              </span>
            </label>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">Review &amp; submit</h2>
            <div className="rounded-card border border-border bg-card p-4">
              {(
                [
                  [
                    'Business type',
                    businessType === 'cloud_kitchen'
                      ? 'Cloud Kitchen'
                      : businessType
                        ? 'Restaurant'
                        : '—',
                  ],
                  ['Owner', `${fields.ownerName} · ${fields.phone}`],
                  ['Email', fields.email],
                  ['Business name', fields.restaurantName],
                  ['Cuisine', fields.cuisine],
                  ['Address', fields.address],
                  [
                    'Location',
                    fields.latitude && fields.longitude
                      ? `${fields.latitude}, ${fields.longitude}`
                      : '—',
                  ],
                  ['FSSAI', fields.fssai],
                  [
                    'Delivery method',
                    deliveryMode === 'self'
                      ? 'Self delivery'
                      : deliveryMode === 'eatswada'
                        ? 'Eatswada delivery'
                        : '—',
                  ],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-3 border-b border-border-soft py-1.5 last:border-0"
                >
                  <span className="text-xs text-ink-soft">{k}</span>
                  <span className="text-right text-sm font-semibold text-ink">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-3 pt-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
          ) : null}
          {step < TOTAL_STEPS - 1 ? (
            <Button type="button" variant="brand" className="flex-1" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="submit" variant="brand" className="flex-1" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit application'}
            </Button>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Already applied?{' '}
        <Link to="/application-status" className="font-bold text-brand-ink">
          Check application
        </Link>
        {' · '}
        <Link to="/login" className="font-bold text-brand-ink">
          Vendor login
        </Link>
      </p>
    </div>
  );
}

function pickDraft(d: ApplicationDraft): Partial<Fields> {
  const out: Partial<Fields> = {};
  for (const key of [
    'ownerName',
    'phone',
    'email',
    'restaurantName',
    'cuisine',
    'description',
    'address',
    'longitude',
    'latitude',
    'fssai',
  ] as const) {
    if (typeof d[key] === 'string') out[key] = d[key] as string;
  }
  return out;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
  readOnly,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
  readOnly?: boolean;
  inputMode?: 'tel' | 'decimal' | 'text' | 'numeric';
  autoComplete?: string;
}) {
  const id = `f-${label.replace(/[^a-z]/gi, '').toLowerCase()}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}
