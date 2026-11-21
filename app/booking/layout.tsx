import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Booking & Contact | Mums Backpackers',
  description: 'Enquire about a stay at Mums Backpackers, check apartment availability, and contact our team directly.',
  alternates: { canonical: '/booking' },
  openGraph: {
    title: 'Booking & Contact | Mums Backpackers',
    description: 'Enquire about a stay at Mums Backpackers and contact our team directly.',
    url: '/booking',
  },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
