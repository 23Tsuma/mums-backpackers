import { BedDouble, CalendarCheck, CalendarClock, CalendarDays, CheckCircle2, CircleX, ClipboardList } from 'lucide-react';
import { getAdminDashboardSummary, type AdminDashboardBooking } from '@/lib/server/admin-dashboard';

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function statusStyle(status: string): string {
  if (status === 'Confirmed') return 'bg-emerald-50 text-emerald-800';
  if (status === 'Pending Confirmation') return 'bg-amber-50 text-amber-800';
  if (status === 'Completed') return 'bg-sky-50 text-sky-800';
  return 'bg-rose-50 text-rose-800';
}

function BookingRows({ bookings }: { bookings: AdminDashboardBooking[] }) {
  if (bookings.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-ink-400">No bookings to show.</p>;
  }

  return (
    <div className="divide-y divide-sage-100">
      {bookings.map((booking) => (
        <article key={booking.reference} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-forest-950">{booking.name}</p>
            <p className="mt-1 text-xs text-ink-500">{booking.reference} · {booking.unit_code ?? 'Apartment unassigned'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-ink-500">{displayDate(booking.checkin)} – {displayDate(booking.checkout)}</span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusStyle(booking.status)}`}>{booking.status}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const summary = await getAdminDashboardSummary();
  const cancelledOrDeclined = summary.cancelledBookings + summary.declinedBookings;
  const cards = [
    { label: 'Total bookings', value: summary.totalBookings, icon: ClipboardList, tone: 'text-forest-800 bg-sage-50' },
    { label: 'Pending requests', value: summary.pendingBookings, icon: CalendarClock, tone: 'text-amber-800 bg-amber-50' },
    { label: 'Confirmed', value: summary.confirmedBookings, icon: CalendarCheck, tone: 'text-emerald-800 bg-emerald-50' },
    { label: 'Declined or cancelled', value: cancelledOrDeclined, icon: CircleX, tone: 'text-rose-800 bg-rose-50' },
    { label: 'Completed', value: summary.completedBookings, icon: CheckCircle2, tone: 'text-sky-800 bg-sky-50' },
    { label: 'Active apartments', value: summary.totalApartments, icon: BedDouble, tone: 'text-forest-800 bg-sage-50' },
  ];

  return (
    <>
      <header className="mb-8">
        <p className="eyebrow">Overview</p>
        <h1 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">Your dashboard.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">A live overview of booking requests and apartment activity.</p>
      </header>

      <section aria-label="Booking summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-sage-100 bg-white p-5 shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-500">{label}</span>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={19} /></span>
            </div>
            <p className="mt-5 font-display text-4xl text-forest-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
          <div className="border-b border-sage-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-forest-950"><CalendarDays size={18} /> Upcoming arrivals</h2>
          </div>
          <BookingRows bookings={summary.upcomingArrivals} />
        </article>
        <article className="overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
          <div className="border-b border-sage-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-forest-950"><CalendarDays size={18} /> Upcoming departures</h2>
          </div>
          <BookingRows bookings={summary.upcomingDepartures} />
        </article>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
        <div className="border-b border-sage-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold text-forest-950"><ClipboardList size={18} /> Recent booking activity</h2>
        </div>
        <BookingRows bookings={summary.recentBookings} />
      </section>
    </>
  );
}
