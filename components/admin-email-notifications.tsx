'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type EmailBooking = {
  id: string;
  reference: string;
  name: string;
  email: string;
  created_at: string;
  admin_email_sent_at: string | null;
  customer_email_sent_at: string | null;
  admin_email_attempts: number;
  customer_email_attempts: number;
  admin_email_next_attempt_at: string | null;
  customer_email_next_attempt_at: string | null;
  admin_email_last_error: string | null;
  customer_email_last_error: string | null;
};

function deliveryStatus(sentAt: string | null, attempts: number, nextAttempt: string | null) {
  if (sentAt) return 'Sent';
  if (attempts >= 8) return 'Retry limit reached';
  if (nextAttempt) return 'Retry scheduled';
  if (attempts > 0) return 'Delivery failed';
  return 'Waiting to send';
}

function statusStyle(status: string) {
  if (status === 'Sent') return 'bg-emerald-50 text-emerald-800';
  if (status === 'Retry limit reached' || status === 'Delivery failed') return 'bg-rose-50 text-rose-800';
  return 'bg-amber-50 text-amber-800';
}

export default function AdminEmailNotifications() {
  const [bookings, setBookings] = useState<EmailBooking[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/notifications');
      const result = await response.json() as { bookings?: EmailBooking[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Email records could not be loaded.');
      setBookings(result.bookings ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Email records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function retry(id: string) {
    setRetrying(id);
    setError('');
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Email delivery could not be retried.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Email delivery could not be retried.');
    } finally {
      setRetrying(null);
    }
  }

  return (
    <section>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Delivery tracking</p><h1 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">Email notifications.</h1><p className="mt-3 text-sm leading-6 text-ink-500">Track guest and administrator booking emails and retry unsuccessful deliveries.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex w-fit items-center gap-2 rounded-full border border-sage-200 px-4 py-2.5 text-sm font-semibold text-forest-900 hover:bg-white disabled:opacity-60"><RefreshCw size={15} /> Refresh</button>
      </header>
      {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
        {loading ? <p className="p-8 text-center text-sm text-ink-500">Loading email records…</p>
          : bookings.length === 0 ? <p className="p-8 text-center text-sm text-ink-500">No booking email records yet.</p>
            : <div className="divide-y divide-sage-100">{bookings.map((booking) => {
              const adminStatus = deliveryStatus(booking.admin_email_sent_at, booking.admin_email_attempts, booking.admin_email_next_attempt_at);
              const customerStatus = deliveryStatus(booking.customer_email_sent_at, booking.customer_email_attempts, booking.customer_email_next_attempt_at);
              const hasUnsent = !booking.admin_email_sent_at || !booking.customer_email_sent_at;
              return <article key={booking.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-semibold text-forest-950">{booking.name} · {booking.reference}</p><p className="mt-1 break-all text-xs text-ink-500">{booking.email}</p></div>
                  {hasUnsent && <button type="button" onClick={() => void retry(booking.id)} disabled={retrying === booking.id} className="inline-flex w-fit items-center gap-2 rounded-full bg-forest-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-forest-800 disabled:opacity-60"><RefreshCw size={13} /> {retrying === booking.id ? 'Retrying…' : 'Retry unsent emails'}</button>}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[{ label: 'Administrator', status: adminStatus, attempts: booking.admin_email_attempts, error: booking.admin_email_last_error }, { label: 'Guest', status: customerStatus, attempts: booking.customer_email_attempts, error: booking.customer_email_last_error }].map((delivery) => <div key={delivery.label} className="rounded-xl bg-cream-50 p-3">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-forest-900">{delivery.label} notification</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle(delivery.status)}`}>{delivery.status}</span></div>
                    <p className="mt-2 text-[11px] text-ink-500">{delivery.attempts} attempt{delivery.attempts === 1 ? '' : 's'}</p>
                    {delivery.error && <p className="mt-2 break-words text-xs text-rose-700">{delivery.error}</p>}
                  </div>)}
                </div>
              </article>;
            })}</div>}
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-400">Showing the 200 most recent bookings. Retry resets the attempt count only for unsent messages; successfully delivered messages are not resent.</p>
    </section>
  );
}
