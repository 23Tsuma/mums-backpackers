import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mums Backpackers | Your comfort, your stay, your experience',
  description: 'A warm, welcoming place to stay, rest, and make your own memories.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
