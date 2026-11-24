'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

const bookingStatuses = ['Pending Confirmation', 'Confirmed', 'Declined', 'Cancelled', 'Completed'];

type Booking = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  unit_code: string | null;
  checkin: string;
  checkout: string;
  adults: number | null;
  children: number | null;
  extra_beds_requested: number | null;
  children_approval_status: string | null;
  guests: string;
  special_requests: string;
  status: string;
  confirmation_email_sent_at: string | null;
  confirmation_email_attempts: number;
  confirmation_email_last_error: string | null;
};

type SafariEnquiry = {
  id: string;
  lead_explorer: string;
  email: string;
  phone: string;
  destination: string;
  target_date: string;
  travelers: number;
  duration: string;
  custom_extension: string;
  diani_accommodation: string;
  status: 'New' | 'Contacted' | 'Confirmed' | 'Closed';
  confirmation_email_sent_at: string | null;
  confirmation_email_attempts: number;
  confirmation_email_last_error: string | null;
};

type VehicleRentalEnquiry = {
  id: string;
  vehicle: string;
  client_name: string;
  telephone: string;
  email: string;
  pickup_date: string;
  duration_days: number;
  status: 'New' | 'Contacted' | 'Confirmed' | 'Closed';
  confirmation_email_sent_at: string | null;
  confirmation_email_attempts: number;
  confirmation_email_last_error: string | null;
};

type EmailResult = { sent: boolean; pending: boolean; message: string };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export default function AdminBookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [safariEnquiries, setSafariEnquiries] = useState<SafariEnquiry[]>([]);
  const [rentalEnquiries, setRentalEnquiries] = useState<VehicleRentalEnquiry[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/admin/bookings?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as {
          bookings?: Booking[];
          safariEnquiries?: SafariEnquiry[];
          vehicleRentalEnquiries?: VehicleRentalEnquiry[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || 'Bookings could not be loaded.');
        setBookings(result.bookings ?? []);
        setSafariEnquiries(result.safariEnquiries ?? []);
        setRentalEnquiries(result.vehicleRentalEnquiries ?? []);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Bookings could not be loaded.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query, status]);

  async function changeStatus(id: string, nextStatus: string) {
    setUpdating(id);
    setError('');
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const result = await response.json() as { error?: string; email?: EmailResult };
      if (!response.ok) throw new Error(result.error || 'Booking status could not be updated.');
      setBookings((current) => current.map((booking) => booking.id === id ? {
        ...booking,
        status: nextStatus,
        ...(nextStatus === 'Confirmed' && result.email
          ? {
            confirmation_email_sent_at: result.email.sent ? new Date().toISOString() : null,
            confirmation_email_attempts: result.email.sent ? booking.confirmation_email_attempts : booking.confirmation_email_attempts + 1,
            confirmation_email_last_error: result.email.sent ? null : result.email.message,
          }
          : nextStatus !== 'Confirmed'
            ? { confirmation_email_sent_at: null, confirmation_email_attempts: 0, confirmation_email_last_error: null }
            : {}),
      } : booking));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Booking status could not be updated.');
    } finally {
      setUpdating(null);
    }
  }

  async function changeSafariStatus(id: string, nextStatus: SafariEnquiry['status']) {
    setUpdating(id);
    setError('');
    try {
      const response = await fetch(`/api/admin/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json() as { error?: string; email?: EmailResult };
      if (!response.ok) throw new Error(result.error || 'Safari enquiry status could not be updated.');
      setSafariEnquiries((current) => current.map((enquiry) => enquiry.id === id ? {
        ...enquiry,
        status: nextStatus,
        ...(nextStatus === 'Confirmed' && result.email
          ? {
            confirmation_email_sent_at: result.email.sent ? new Date().toISOString() : null,
            confirmation_email_attempts: result.email.sent ? enquiry.confirmation_email_attempts : enquiry.confirmation_email_attempts + 1,
            confirmation_email_last_error: result.email.sent ? null : result.email.message,
          }
          : nextStatus !== 'Confirmed'
            ? { confirmation_email_sent_at: null, confirmation_email_attempts: 0, confirmation_email_last_error: null }
            : {}),
      } : enquiry));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Safari enquiry status could not be updated.');
    } finally {
      setUpdating(null);
    }
  }

  async function changeRentalStatus(id: string, nextStatus: VehicleRentalEnquiry['status']) {
    setUpdating(id);
    setError('');
    try {
      const response = await fetch(`/api/admin/rentals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json() as { error?: string; email?: EmailResult };
      if (!response.ok) throw new Error(result.error || 'Vehicle rental request status could not be updated.');
      setRentalEnquiries((current) => current.map((enquiry) => enquiry.id === id ? {
        ...enquiry,
        status: nextStatus,
        ...(nextStatus === 'Confirmed' && result.email
          ? {
            confirmation_email_sent_at: result.email.sent ? new Date().toISOString() : null,
            confirmation_email_attempts: result.email.sent ? enquiry.confirmation_email_attempts : enquiry.confirmation_email_attempts + 1,
            confirmation_email_last_error: result.email.sent ? null : result.email.message,
          }
          : nextStatus !== 'Confirmed'
            ? { confirmation_email_sent_at: null, confirmation_email_attempts: 0, confirmation_email_last_error: null }
            : {}),
      } : enquiry));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Vehicle rental request status could not be updated.');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <section>
      <header className="mb-8">
        <p className="eyebrow">Reservations</p>
        <h1 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">Booking management.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">Review accommodation bookings, vehicle rentals, and safari enquiries in one place.</p>
      </header>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_230px]">
        <label className="relative block">
          <span className="sr-only">Search bookings</span>
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="field-input !mt-0 pl-11" placeholder="Search name, email, phone or reference" />
        </label>
        <label>
          <span className="sr-only">Filter by booking status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="field-input !mt-0">
            <option value="all">All statuses</option>
            {bookingStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
        {loading ? <p className="p-8 text-center text-sm text-ink-500">Loading bookings…</p>
          : bookings.length === 0 ? <p className="p-8 text-center text-sm text-ink-500">No booking requests match your filters.</p>
            : <div className="divide-y divide-sage-100">
              {bookings.map((booking) => (
                <article key={booking.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-forest-950">{booking.name}</p>
                      <p className="mt-1 break-all text-xs text-ink-500">{booking.reference} · {booking.unit_code ?? 'Apartment unassigned'}</p>
                      <p className="mt-2 text-sm text-ink-600">{booking.email}{booking.phone ? ` · ${booking.phone}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-ink-500">{dateLabel(booking.checkin)} – {dateLabel(booking.checkout)}</span>
                      <select
                        aria-label={`Update status for ${booking.reference}`}
                        value={booking.status}
                        disabled={updating === booking.id}
                        onChange={(event) => void changeStatus(booking.id, event.target.value)}
                        className="rounded-full border border-sage-200 bg-white px-3 py-2 text-xs font-bold text-forest-900 outline-none focus:border-forest-600 disabled:opacity-60"
                      >
                        {bookingStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs text-ink-500 sm:grid-cols-3">
                    <p>Guests: {booking.guests}</p>
                    <p>Children: {booking.children ?? 'Not recorded'} · Extra beds: {booking.extra_beds_requested ?? 'Not recorded'}</p>
                    <p>Child arrangement: {booking.children_approval_status ?? 'Not recorded'}</p>
                  </div>
                  {booking.special_requests && <p className="mt-3 rounded-xl bg-cream-50 px-4 py-3 text-sm leading-6 text-ink-600"><span className="font-semibold text-forest-900">Guest notes: </span>{booking.special_requests}</p>}
                  {booking.status === 'Confirmed' && <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                    <span className={booking.confirmation_email_sent_at ? 'text-emerald-800' : 'text-amber-800'}>
                      {booking.confirmation_email_sent_at ? 'Confirmation email sent.' : booking.confirmation_email_last_error || 'Confirmation email has not been sent.'}
                    </span>
                    {!booking.confirmation_email_sent_at && <button type="button" disabled={updating === booking.id} onClick={() => void changeStatus(booking.id, 'Confirmed')} className="font-bold text-forest-800 underline underline-offset-4 disabled:opacity-60">Send / retry confirmation email</button>}
                  </div>}
                </article>
              ))}
            </div>}
      </div>
      <p className="mt-4 text-xs text-ink-400">Showing up to 500 most recent booking requests. Confirming a booking approves child sleeping arrangements and is checked against apartment availability.</p>
      <section className="mt-8 overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
        <div className="border-b border-sage-100 px-5 py-4"><h2 className="font-semibold text-forest-950">Vehicle rental requests</h2></div>
        {loading ? <p className="p-6 text-sm text-ink-500">Loading vehicle rental requests…</p>
          : rentalEnquiries.length === 0 ? <p className="p-6 text-sm text-ink-500">No vehicle rental requests yet.</p>
            : <div className="divide-y divide-sage-100">{rentalEnquiries.map((enquiry) => <article key={enquiry.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="font-semibold text-forest-950">{enquiry.vehicle} · {enquiry.client_name}</p><p className="mt-1 break-all text-sm text-ink-500">{enquiry.email} · {enquiry.telephone}</p><p className="mt-2 text-xs text-ink-500">Picking date: {dateLabel(enquiry.pickup_date)} · {enquiry.duration_days} day{enquiry.duration_days === 1 ? '' : 's'}</p></div>
                <select aria-label={`Update rental request status for ${enquiry.client_name}`} value={enquiry.status} disabled={updating === enquiry.id} onChange={(event) => void changeRentalStatus(enquiry.id, event.target.value as VehicleRentalEnquiry['status'])} className="rounded-full border border-sage-200 bg-white px-3 py-2 text-xs font-bold text-forest-900 outline-none focus:border-forest-600 disabled:opacity-60">
                  {['New', 'Contacted', 'Confirmed', 'Closed'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              {enquiry.status === 'Confirmed' && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className={enquiry.confirmation_email_sent_at ? 'text-emerald-800' : 'text-amber-800'}>
                  {enquiry.confirmation_email_sent_at ? 'Confirmation email sent.' : enquiry.confirmation_email_last_error || 'Confirmation email has not been sent.'}
                </span>
                {!enquiry.confirmation_email_sent_at && <button type="button" disabled={updating === enquiry.id} onClick={() => void changeRentalStatus(enquiry.id, 'Confirmed')} className="font-bold text-forest-800 underline underline-offset-4 disabled:opacity-60">Send / retry confirmation email</button>}
              </div>}
            </article>)}</div>}
      </section>
      <section className="mt-8 overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
        <div className="border-b border-sage-100 px-5 py-4"><h2 className="font-semibold text-forest-950">Safari enquiries</h2></div>
        {loading ? <p className="p-6 text-sm text-ink-500">Loading safari enquiries…</p>
          : safariEnquiries.length === 0 ? <p className="p-6 text-sm text-ink-500">No safari enquiries yet.</p>
            : <div className="divide-y divide-sage-100">{safariEnquiries.map((enquiry) => <article key={enquiry.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="font-semibold text-forest-950">{enquiry.lead_explorer} · {enquiry.destination}</p><p className="mt-1 break-all text-sm text-ink-500">{enquiry.email}{enquiry.phone ? ` · ${enquiry.phone}` : ''}</p><p className="mt-2 text-xs text-ink-500">{dateLabel(enquiry.target_date)} · {enquiry.travelers} traveler{enquiry.travelers === 1 ? '' : 's'} · {enquiry.duration}{enquiry.custom_extension ? `: ${enquiry.custom_extension}` : ''}</p>{enquiry.diani_accommodation && <p className="mt-1 text-xs text-ink-500">Current Diani accommodation: {enquiry.diani_accommodation}</p>}</div>
                <select aria-label={`Update safari enquiry status for ${enquiry.lead_explorer}`} value={enquiry.status} disabled={updating === enquiry.id} onChange={(event) => void changeSafariStatus(enquiry.id, event.target.value as SafariEnquiry['status'])} className="rounded-full border border-sage-200 bg-white px-3 py-2 text-xs font-bold text-forest-900 outline-none focus:border-forest-600 disabled:opacity-60">
                  {['New', 'Contacted', 'Confirmed', 'Closed'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              {enquiry.status === 'Confirmed' && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className={enquiry.confirmation_email_sent_at ? 'text-emerald-800' : 'text-amber-800'}>
                  {enquiry.confirmation_email_sent_at ? 'Confirmation email sent.' : enquiry.confirmation_email_last_error || 'Confirmation email has not been sent.'}
                </span>
                {!enquiry.confirmation_email_sent_at && <button type="button" disabled={updating === enquiry.id} onClick={() => void changeSafariStatus(enquiry.id, 'Confirmed')} className="font-bold text-forest-800 underline underline-offset-4 disabled:opacity-60">Send / retry confirmation email</button>}
              </div>}
            </article>)}</div>}
      </section>
    </section>
  );
}
