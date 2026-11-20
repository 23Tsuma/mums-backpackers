import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  BedDouble,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MailCheck,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import AdminLogoutButton from '@/components/admin-logout-button';
import { adminSessionCookieName, getAdminSession } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession(cookies().get(adminSessionCookieName())?.value);
  if (!admin) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900 md:pl-64">
      <aside className="border-b border-sage-200 bg-white px-6 py-5 md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r md:px-5">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-950 text-gold-200"><Sparkles size={17} /></span>
          <span><span className="block font-display text-xl leading-none text-forest-950">Mums</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-700">Admin workspace</span></span>
        </Link>
        <nav aria-label="Admin navigation" className="mt-8 flex gap-2 overflow-x-auto md:flex-col">
          <Link href="/admin" className="inline-flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-forest-950 transition-colors hover:bg-sage-50"><LayoutDashboard size={17} /> Dashboard</Link>
          <Link href="/admin/properties" className="inline-flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-forest-950 transition-colors hover:bg-sage-50"><BedDouble size={17} /> Properties</Link>
          {[
            { label: 'Booking Management', icon: ClipboardList },
            { label: 'Booking Calendar', icon: CalendarDays },
            { label: 'Customers', icon: Users },
            { label: 'Email Notifications', icon: MailCheck },
          ].map(({ label, icon: Icon }) => (
            <span key={label} aria-disabled="true" title="Available in the next implementation stage" className="inline-flex shrink-0 cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-300">
              <Icon size={17} /> {label}<span className="ml-auto hidden text-[9px] uppercase tracking-wide md:inline">Later</span>
            </span>
          ))}
          <Link href="/admin/settings" className="inline-flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-forest-950 transition-colors hover:bg-sage-50"><Settings size={17} /> Settings</Link>
        </nav>
        <div className="mt-8 hidden border-t border-sage-100 pt-6 md:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Signed in as</p>
          <p className="mt-2 break-all text-sm font-medium text-forest-950">{admin.email}</p>
          <div className="mt-5"><AdminLogoutButton /></div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-sage-100 pt-4 md:hidden">
          <span className="max-w-[65%] truncate text-xs text-ink-500">{admin.email}</span>
          <AdminLogoutButton />
        </div>
      </aside>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
