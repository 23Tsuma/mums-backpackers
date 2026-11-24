import type { Metadata } from 'next';
import RentalSafariPage from '@/components/rental-safari-page';

export const metadata: Metadata = {
  title: 'Car Rental & Safaris | Mums Backpackers',
  description: 'Explore vehicle rental options and plan a safari from Diani with the Mums Backpackers Expedition Desk.',
  alternates: { canonical: '/travel' },
  openGraph: {
    title: 'Car Rental & Safaris | Mums Backpackers',
    description: 'Browse rental vehicles and send a safari planning enquiry from Diani.',
    url: '/travel',
  },
};

export default function TravelPage() {
  return <RentalSafariPage />;
}
