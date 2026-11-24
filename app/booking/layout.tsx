import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book Accommodation in Diani Beach | Mums Backpackers',
  description: 'Check availability and enquire about furnished accommodation in Diani Beach, Kenya. Contact Mums Backpackers directly to plan your stay.',
  alternates: { canonical: '/booking' },
  openGraph: {
    title: 'Book Accommodation in Diani Beach | Mums Backpackers',
    description: 'Check availability and enquire about furnished accommodation in Diani Beach, Kenya.',
    url: '/booking',
  },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
