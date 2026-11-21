import './globals.css';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Mums Backpackers | Your comfort, your stay, your experience',
  metadataBase: SITE_URL,
  description: 'Discover comfortable, furnished stays at Mums Backpackers. Explore our rooms and shared spaces, then enquire directly about your visit.',
  applicationName: 'Mums Backpackers',
  keywords: [
    'Mums Backpackers',
    'furnished accommodation',
    'traveller accommodation',
    'short stays',
    'comfortable apartment stays',
  ],
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Mums Backpackers',
    title: 'Mums Backpackers | Comfortable, furnished stays',
    description: 'Explore the furnished rooms and welcoming spaces at Mums Backpackers.',
    images: [
      {
        url: '/images/gallery-lounge.jpg',
        width: 1029,
        height: 768,
        alt: 'Furnished lounge at Mums Backpackers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mums Backpackers | Comfortable, furnished stays',
    description: 'Explore the furnished rooms and welcoming spaces at Mums Backpackers.',
    images: ['/images/gallery-lounge.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
