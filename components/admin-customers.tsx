'use client';

import { useEffect, useState } from 'react';

type Customer = {
  name: string;
  email: string;
  phone: string;
  booking_count: number;
  first_booking: string;
  latest_booking: string;
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
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [enquiries, setEnquiries] = useState<SafariEnquiry[]>([]);
  const [rentalEnquiries, setRentalEnquiries] = useState<VehicleRentalEnquiry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/customers', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as {
          customers?: Customer[];
          safariEnquiries?: SafariEnquiry[];
          vehicleRentalEnquiries?: VehicleRentalEnquiry[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || 'Customer records could not be loaded.');
        setCustomers(result.customers ?? []);
        setEnquiries(result.safariEnquiries ?? []);
        setRentalEnquiries(result.vehicleRentalEnquiries ?? []);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Customer records could not be loaded.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function changeEnquiryStatus(id: string, status: SafariEnquiry['status']) {
    setUpdating(id);
    setError('');
    try {
      const response = await fetch(`/api/admin/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { error?: string; email?: EmailResult };
      if (!response.ok) throw new Error(result.error || 'Safari enquiry status could not be updated.');
      setEnquiries((current) => current.map((enquiry) => enquiry.id === id ? {
        ...enquiry,
        status,
        ...(status === 'Confirmed' && result.email
          ? {
            confirmation_email_sent_at: result.email.sent ? new Date().toISOString() : null,
            confirmation_email_attempts: result.email.sent ? enquiry.confirmation_email_attempts : enquiry.confirmation_email_attempts + 1,
            confirmation_email_last_error: result.email.sent ? null : result.email.message,
          }
          : status !== 'Confirmed'
            ? { confirmation_email_sent_at: null, confirmation_email_attempts: 0, confirmation_email_last_error: null }
            : {}),
      } : enquiry));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Safari enquiry status could not be updated.');
    } finally {
      setUpdating(null);
    }
  }

  async function changeRentalStatus(id: string, status: VehicleRentalEnquiry['status']) {
    setUpdating(id);
    setError('');
    try {
      const response = await fetch(`/api/admin/rentals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { error?: string; email?: EmailResult };
      if (!response.ok) throw new Error(result.error || 'Vehicle rental request status could not be updated.');
      setRentalEnquiries((current) => current.map((enquiry) => enquiry.id === id ? {
        ...enquiry,
        status,
        ...(status === 'Confirmed' && result.email
          ? {
            confirmation_email_sent_at: result.email.sent ? new Date().toISOString() : null,
            confirmation_email_attempts: result.email.sent ? enquiry.confirmation_email_attempts : enquiry.confirmation_email_attempts + 1,
            confirmation_email_last_error: result.email.sent ? null : result.email.message,
          }
          : status !== 'Confirmed'
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
        <p className="eyebrow">Guest relationships</p>
        <h1 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">Customers.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">Guest contacts, vehicle rental requests, and incoming safari plans.</p>
      </header>
      {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
      <section className="mb-8 overflow-hidden rounded-2xl border border-sage-100 bg-white">
        <div className="border-b border-sage-100 px-5 py-4"><h2 className="font-semibold text-forest-950">Accommodation guests</h2></div>
        {loading ? <p className="p-6 text-sm text-ink-500">Loading customer records…</p>
          : customers.length === 0 ? <p className="p-6 text-sm text-ink-500">No customer bookings yet.</p>
            : <div className="divide-y divide-sage-100">{customers.map((customer) => <article key={customer.email} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center"><div><p className="text-sm font-semibold text-forest-950">{customer.name}</p><p className="mt-1 text-xs text-ink-500">{customer.phone || 'No phone recorded'}</p></div><a href={`mailto:${customer.email}`} className="break-all text-sm text-forest-800 underline decoration-sage-300 underline-offset-4">{customer.email}</a><div className="text-xs text-ink-500">{customer.booking_count} booking{customer.booking_count === 1 ? '' : 's'} · Last stay {dateLabel(customer.latest_booking)}</div></article>)}</div>}
      </section>
      <section className="overflow-hidden rounded-2xl border border-sage-100 bg-white">
        <div className="border-b border-sage-100 px-5 py-4"><h2 className="font-semibold text-forest-950">Safari enquiries</h2></div>
        {loading ? <p className="p-6 text-sm text-ink-500">Loading safari enquiries…</p>
          : enquiries.length === 0 ? <p className="p-6 text-sm text-ink-500">No safari enquiries yet.</p>
            : <div className="divide-y divide-sage-100">{enquiries.map((enquiry) => <article key={enquiry.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="font-semibold text-forest-950">{enquiry.lead_explorer} <span className="font-normal text-ink-500">· {enquiry.destination}</span></p><p className="mt-1 text-sm text-ink-500">{enquiry.email}{enquiry.phone ? ` · ${enquiry.phone}` : ''}</p></div>
                <select aria-label={`Update safari enquiry status for ${enquiry.lead_explorer}`} value={enquiry.status} disabled={updating === enquiry.id} onChange={(event) => void changeEnquiryStatus(enquiry.id, event.target.value as SafariEnquiry['status'])} className="rounded-full border border-sage-200 bg-white px-3 py-2 text-xs font-bold text-forest-900 outline-none focus:border-forest-600 disabled:opacity-60">
                  {['New', 'Contacted', 'Confirmed', 'Closed'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <p className="mt-3 text-sm text-ink-600">{dateLabel(enquiry.target_date)} · {enquiry.travelers} traveler{enquiry.travelers === 1 ? '' : 's'} · {enquiry.duration}{enquiry.custom_extension ? `: ${enquiry.custom_extension}` : ''}</p>
              {enquiry.diani_accommodation && <p className="mt-2 text-xs text-ink-500">Current Diani accommodation: {enquiry.diani_accommodation}</p>}
              {enquiry.status === 'Confirmed' && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className={enquiry.confirmation_email_sent_at ? 'text-emerald-800' : 'text-amber-800'}>
                  {enquiry.confirmation_email_sent_at ? 'Confirmation email sent.' : enquiry.confirmation_email_last_error || 'Confirmation email has not been sent.'}
                </span>
                {!enquiry.confirmation_email_sent_at && <button type="button" disabled={updating === enquiry.id} onClick={() => void changeEnquiryStatus(enquiry.id, 'Confirmed')} className="font-bold text-forest-800 underline underline-offset-4 disabled:opacity-60">Send / retry confirmation email</button>}
              </div>}
            </article>)}</div>}
      </section>
      <section className="mt-8 overflow-hidden rounded-2xl border border-sage-100 bg-white">
        <div className="border-b border-sage-100 px-5 py-4"><h2 className="font-semibold text-forest-950">Vehicle rental requests</h2></div>
        {loading ? <p className="p-6 text-sm text-ink-500">Loading vehicle rental requests…</p>
          : rentalEnquiries.length === 0 ? <p className="p-6 text-sm text-ink-500">No vehicle rental requests yet.</p>
            : <div className="divide-y divide-sage-100">{rentalEnquiries.map((enquiry) => <article key={enquiry.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="font-semibold text-forest-950">{enquiry.vehicle} <span className="font-normal text-ink-500">· {enquiry.client_name}</span></p><p className="mt-1 break-all text-sm text-ink-500">{enquiry.email} · {enquiry.telephone}</p></div>
                <select aria-label={`Update rental request status for ${enquiry.client_name}`} value={enquiry.status} disabled={updating === enquiry.id} onChange={(event) => void changeRentalStatus(enquiry.id, event.target.value as VehicleRentalEnquiry['status'])} className="rounded-full border border-sage-200 bg-white px-3 py-2 text-xs font-bold text-forest-900 outline-none focus:border-forest-600 disabled:opacity-60">
                  {['New', 'Contacted', 'Confirmed', 'Closed'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <p className="mt-3 text-sm text-ink-600">Picking date: {dateLabel(enquiry.pickup_date)} · {enquiry.duration_days} day{enquiry.duration_days === 1 ? '' : 's'}</p>
              {enquiry.status === 'Confirmed' && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className={enquiry.confirmation_email_sent_at ? 'text-emerald-800' : 'text-amber-800'}>
                  {enquiry.confirmation_email_sent_at ? 'Confirmation email sent.' : enquiry.confirmation_email_last_error || 'Confirmation email has not been sent.'}
                </span>
                {!enquiry.confirmation_email_sent_at && <button type="button" disabled={updating === enquiry.id} onClick={() => void changeRentalStatus(enquiry.id, 'Confirmed')} className="font-bold text-forest-800 underline underline-offset-4 disabled:opacity-60">Send / retry confirmation email</button>}
              </div>}
            </article>)}</div>}
      </section>
    </section>
  );
}
