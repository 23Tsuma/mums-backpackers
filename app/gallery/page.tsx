import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import PhotoGallery from '@/components/photo-gallery';
import SiteNavigation from '@/components/site-navigation';

export const metadata: Metadata = {
  title: 'Gallery | Mums Backpackers',
  description: 'Explore the rooms, kitchen, balcony, and welcoming spaces at Mums Backpackers.',
  alternates: { canonical: '/gallery' },
  openGraph: { url: '/gallery' },
};

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-cream-50 text-ink-900">
      <header className="border-b border-sage-200 bg-cream-50/95 px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-5">
          <Link href="/" className="group flex items-center gap-3" aria-label="Mums Backpackers home">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-950 text-gold-200 transition-transform group-hover:rotate-12">
              <Sparkles size={17} />
            </span>
            <span>
              <span className="block font-display text-xl leading-none text-forest-950">Mums</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-700">Backpackers</span>
            </span>
          </Link>
          <SiteNavigation currentPage="gallery" />
          <Link href="/booking" className="hidden items-center gap-2 rounded-full bg-forest-950 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-forest-800 md:inline-flex">
            Enquire now <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>

      <section className="bg-white px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="mb-9 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 transition-colors hover:text-gold-700">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <div className="max-w-3xl">
            <p className="eyebrow">A closer look</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] text-forest-950 sm:text-6xl">
              A little glimpse of <em className="text-forest-700">Mums.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-600">
              From a quiet place to unwind to the thoughtful comforts of home, explore the spaces waiting for you.
              Select a photo to see it up close.
            </p>
          </div>

          <PhotoGallery />

          <div className="mt-14 flex flex-col justify-between gap-5 rounded-2xl bg-forest-950 p-7 text-white sm:flex-row sm:items-center sm:p-9">
            <div>
              <p className="eyebrow text-gold-200">Picture yourself here</p>
              <h2 className="mt-3 font-display text-3xl">Ready to plan your stay?</h2>
            </div>
            <Link href="/booking" className="group inline-flex w-fit items-center gap-3 rounded-full bg-gold-300 px-6 py-3.5 text-sm font-bold text-forest-950 transition-all hover:-translate-y-0.5 hover:bg-gold-200">
              Booking & Contact <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-sage-200 px-6 py-7 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 text-xs text-ink-400 sm:flex-row">
          <span>© 2026 Mums Backpackers</span>
          <Link href="/booking" className="transition-colors hover:text-forest-800">info@mumsbackpackers.com · Booking & Contact</Link>
        </div>
      </footer>
    </main>
  );
}
