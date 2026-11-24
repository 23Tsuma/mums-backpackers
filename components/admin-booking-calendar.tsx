'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';

type Booking = {
  id: string;
  reference: string;
  name: string;
  unit_code: string | null;
  checkin: string;
  checkout: string;
  status: string;
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AdminBookingCalendar() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const start = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay()), [month]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)), [start]);
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month);

  useEffect(() => {
    const controller = new AbortController();
    const first = dateKey(new Date(month.getFullYear(), month.getMonth(), 1));
    const last = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    setLoading(true);
    setError('');
    fetch(`/api/admin/bookings?from=${first}&to=${last}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { bookings?: Booking[]; error?: string };
        if (!response.ok) throw new Error(result.error || 'Calendar bookings could not be loaded.');
        setBookings(result.bookings ?? []);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Calendar bookings could not be loaded.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [month]);

  const selectedBookings = bookings.filter((booking) => booking.checkin.slice(0, 10) <= selectedDate
    && booking.checkout.slice(0, 10) > selectedDate
    && !['Declined', 'Cancelled', 'Completed'].includes(booking.status));

  return (
    <section>
      <header className="mb-8">
        <p className="eyebrow">Availability</p>
        <h1 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">Booking calendar.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">See apartment stays at a glance and select a day for its arrivals.</p>
      </header>
      {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
      <div className="rounded-2xl border border-sage-100 bg-white p-4 shadow-[0_8px_30px_rgba(26,61,42,0.04)] sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="grid h-10 w-10 place-items-center rounded-full border border-sage-200 text-forest-900 hover:bg-sage-50"><ArrowLeft size={17} /></button>
          <h2 className="font-display text-2xl text-forest-950">{monthLabel}</h2>
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="grid h-10 w-10 place-items-center rounded-full border border-sage-200 text-forest-900 hover:bg-sage-50"><ArrowRight size={17} /></button>
        </div>
        <div className="grid grid-cols-7 border-l border-t border-sage-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="border-b border-r border-sage-100 bg-cream-50 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-ink-500">{day}</div>)}
          {days.map((day) => {
            const key = dateKey(day);
            const dailyBookings = bookings.filter((booking) => booking.checkin.slice(0, 10) <= key
              && booking.checkout.slice(0, 10) > key
              && !['Declined', 'Cancelled', 'Completed'].includes(booking.status));
            const inMonth = day.getMonth() === month.getMonth();
            return (
              <button key={key} type="button" onClick={() => setSelectedDate(key)} className={`min-h-[84px] border-b border-r border-sage-100 p-1.5 text-left transition-colors sm:min-h-[110px] sm:p-2 ${inMonth ? 'bg-white' : 'bg-cream-50/60'} ${selectedDate === key ? 'ring-2 ring-inset ring-forest-600' : 'hover:bg-sage-50'}`}>
                <span className={`text-xs font-semibold ${inMonth ? 'text-forest-950' : 'text-ink-300'}`}>{day.getDate()}</span>
                <span className="mt-1 block space-y-1">
                  {dailyBookings.slice(0, 2).map((booking) => <span key={booking.id} title={`${booking.name} · ${booking.reference}`} className={`block truncate rounded px-1 py-0.5 text-[9px] sm:text-[10px] ${booking.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{booking.unit_code ?? booking.name}</span>)}
                  {dailyBookings.length > 2 && <span className="block text-[9px] text-ink-500">+{dailyBookings.length - 2} more</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-500"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200" />Confirmed</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-amber-200" />Pending confirmation</span></div>
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-sage-100 bg-white">
        <div className="flex items-center gap-2 border-b border-sage-100 px-5 py-4 font-semibold text-forest-950"><CalendarDays size={18} /> {new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date(`${selectedDate}T00:00:00`))}</div>
        {loading ? <p className="p-5 text-sm text-ink-500">Loading stays…</p>
          : selectedBookings.length === 0 ? <p className="p-5 text-sm text-ink-500">No active stays on this day.</p>
            : <div className="divide-y divide-sage-100">{selectedBookings.map((booking) => <div key={booking.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:justify-between"><span className="text-sm font-semibold text-forest-950">{booking.name} · {booking.unit_code ?? 'Unassigned'}</span><span className="text-xs text-ink-500">{booking.reference} · {booking.status} · {booking.checkin.slice(0, 10)} – {booking.checkout.slice(0, 10)}</span></div>)}</div>}
      </section>
    </section>
  );
}
