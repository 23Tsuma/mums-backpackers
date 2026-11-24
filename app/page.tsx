import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicProperties from '@/components/public-properties';
import HeroSlideshow from '@/components/hero-slideshow';
import SiteNavigation from '@/components/site-navigation';
import { SITE_URL } from '@/lib/site-url';
import {
  ArrowUpRight,
  BedDouble,
  Coffee,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wifi,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Accommodation in Diani Beach, Kenya | Mums Backpackers',
  description: 'Looking for accommodation in Diani Beach? Explore furnished rooms and apartment stays at Mums Backpackers, check availability, and enquire directly.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Accommodation in Diani Beach, Kenya | Mums Backpackers',
    description: 'Explore furnished rooms and apartment stays at Mums Backpackers in Diani Beach, Kenya.',
    url: '/',
  },
};

const photos = [
  {
    src: '/images/gallery-lounge.jpg',
    alt: 'Comfortably furnished lounge with sofas and a bright sitting area',
    label: 'Settle in and feel at home',
  },
  {
    src: '/images/gallery-bedroom.jpg',
    alt: 'A neatly made bed in a furnished bedroom',
    label: 'Rest easy',
  },
  {
    src: '/images/gallery-kitchen.jpg',
    alt: 'Furnished kitchen with dishes and counter space',
    label: 'Everyday comforts',
  },
  {
    src: '/images/gallery-terrace.jpg',
    alt: 'Outdoor terrace with furnished seating',
    label: 'A quiet moment outdoors',
  },
];

const features = [
  { icon: BedDouble, title: 'A restful base', text: 'Thoughtfully prepared rooms for slow mornings and good nights.' },
  { icon: Wifi, title: 'Stay connected', text: 'Reliable essentials for planning your next adventure.' },
  { icon: Coffee, title: 'Feel at home', text: 'A welcoming kitchen and shared spaces to settle into.' },
  { icon: ShieldCheck, title: 'Peace of mind', text: 'A comfortable, cared-for place to return to each day.' },
];

export default function Home() {
  return (
    <main>
      <section className="relative min-h-[720px] overflow-hidden bg-[#252524] text-white">
        <HeroSlideshow />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, rgba(31, 31, 30, 0.84) 0%, rgba(57, 56, 53, 0.52) 54%, rgba(114, 108, 96, 0.12) 100%)',
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LodgingBusiness',
              name: 'Mums Backpackers Residence',
              alternateName: 'Mums Backpackers',
              url: SITE_URL.toString(),
              image: [
                new URL('/images/gallery-lounge.jpg', SITE_URL).toString(),
                new URL('/images/mums-backpackers-exterior.jpg', SITE_URL).toString(),
              ],
              description: 'Furnished accommodation with welcoming shared spaces in Diani Beach, Kenya.',
              email: 'info@mumsbackpackers.com',
              telephone: '+254727863245',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Diani Beach',
                addressRegion: 'Kwale County',
                addressCountry: 'KE',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: -4.30687,
                longitude: 39.563587,
              },
              hasMap: 'https://maps.app.goo.gl/ntQM8yCe9xYh8z8r5',
              sameAs: ['https://maps.app.goo.gl/ntQM8yCe9xYh8z8r5'],
            }).replace(/</g, '\\u003c'),
          }}
        />
        <div className="relative mx-auto flex min-h-[720px] max-w-7xl flex-col px-6 lg:px-10">
          <header className="flex items-center justify-between border-b border-white/20 py-6">
            <Link href="/" className="group flex items-center gap-3" aria-label="Mums Backpackers home">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-gold-300/60 text-gold-200 transition-transform group-hover:rotate-12">
                <Sparkles size={19} />
              </span>
              <span>
                <span className="block font-display text-xl leading-none tracking-wide">Mums</span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-200">Backpackers</span>
              </span>
            </Link>
            <SiteNavigation currentPage="home" variant="dark" />
            <Link href="/booking" className="hidden rounded-full border border-gold-200/70 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-gold-100 transition-all hover:bg-gold-200 hover:text-forest-950 md:inline-flex">Enquire now</Link>
          </header>
          <div className="flex flex-1 items-center pb-20 pt-24">
            <div className="max-w-2xl animate-fade-up">
              <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-gold-200"><span className="h-px w-9 bg-gold-300" />Your stay, made warm</p>
              <h1 className="max-w-3xl font-display text-6xl leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">Welcome to <em className="font-display text-gold-200">Mums</em> Backpackers.</h1>
              <p className="mt-7 max-w-lg text-lg leading-8 text-white/80">Find your place to stay in Diani Beach, Kenya. Discover furnished rooms and spaces that feel like home.</p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/booking" className="group inline-flex items-center gap-3 rounded-full bg-gold-300 px-7 py-4 text-sm font-bold text-forest-950 transition-all hover:-translate-y-1 hover:bg-gold-200">Book your stay <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Link>
                <a href="#stay" className="rounded-full border border-white/30 px-7 py-4 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10">Explore the space</a>
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-3 pb-7 text-xs text-white/60 sm:flex"><MapPin size={15} className="text-gold-200" /> Diani Beach, Kwale County, Kenya</div>
        </div>
      </section>

      <section className="bg-cream-50 px-6 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div><p className="eyebrow">The Mums feeling</p><h2 className="section-title mt-5">Come as you are.<br /><span className="text-forest-700">Stay a little longer.</span></h2></div>
          <div className="max-w-xl lg:pb-2"><p className="text-lg leading-8 text-ink-600">Mums Backpackers offers furnished accommodation in Diani Beach, Kenya—a calm, characterful home base where you can unpack, recharge, and meet each day at your own pace.</p><p className="mt-5 text-sm leading-7 text-ink-500">From the natural light in your room to the easy rhythm of the shared spaces, every detail is about making your stay feel uncomplicated and yours.</p></div>
        </div>
      </section>

      <section id="stay" className="bg-white px-6 py-20 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl"><div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Why stay with us</p><h2 className="section-title mt-4">The essentials,<br /><span className="text-forest-700">thoughtfully done.</span></h2></div><p className="max-w-xs text-sm leading-6 text-ink-500">Everything you need for an easy, comfortable stay.</p></div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-sage-200 bg-sage-200 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, text }) => <div key={title} className="group bg-white p-7 transition-colors hover:bg-cream-50"><Icon size={25} strokeWidth={1.5} className="text-gold-600 transition-transform group-hover:-translate-y-1" /><h3 className="mt-7 font-display text-2xl text-forest-900">{title}</h3><p className="mt-3 text-sm leading-6 text-ink-500">{text}</p></div>)}</div>
        </div>
      </section>

      <PublicProperties />

      <section className="bg-forest-950 px-6 py-24 text-white lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-center"><div><p className="eyebrow text-gold-200">A place to land</p><h2 className="section-title mt-5 text-white">Room to rest.<br /><span className="text-gold-200">Space to breathe.</span></h2><p className="mt-7 max-w-sm leading-7 text-white/65">Our furnished rooms and shared spaces are prepared with the little things that make a place feel right.</p><Link href="/booking" className="mt-9 inline-flex items-center gap-2 text-sm font-bold text-gold-200 underline decoration-gold-200/40 underline-offset-8 transition-colors hover:text-white">Ask about your stay <ArrowUpRight size={16} /></Link></div><div className="grid gap-5 sm:grid-cols-2"><div className="relative aspect-[4/5] overflow-hidden rounded-2xl sm:translate-y-8"><Image src={photos[1].src} alt={photos[1].alt} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-700 hover:scale-105" /></div><div className="relative aspect-[4/5] overflow-hidden rounded-2xl"><Image src={photos[0].src} alt={photos[0].alt} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-700 hover:scale-105" /></div></div></div>
      </section>

      <section className="bg-cream-50 px-6 py-24 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-10 flex items-end justify-between"><div><p className="eyebrow">A glimpse inside</p><h2 className="section-title mt-4">The little details<br /><span className="text-forest-700">matter.</span></h2></div><span className="hidden text-sm text-ink-400 sm:block">01 — 04</span></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{photos.map((photo) => <div key={photo.src} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-sage-50"><Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-950/80 to-transparent p-5 pt-14"><p className="text-sm font-medium text-white">{photo.label}</p></div></div>)}</div></div></section>

      <section className="bg-white px-6 py-24 lg:px-10"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center"><div><p className="eyebrow">Find your way here</p><h2 className="section-title mt-4">Close to what<br /><span className="text-forest-700">matters.</span></h2><p className="mt-6 max-w-md leading-7 text-ink-500">Easy to reach, easy to settle into. Send us a message for directions, local recommendations, and everything you need before arrival.</p><a href="https://maps.app.goo.gl/ntQM8yCe9xYh8z8r5" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream-100 px-5 py-3 text-sm font-semibold text-forest-900 transition-colors hover:bg-sage-100"><MapPin size={16} className="text-gold-600" />View Mums Backpackers on Google Maps <ArrowUpRight size={15} /></a></div><div className="relative min-h-[300px] overflow-hidden rounded-2xl bg-sage-50"><iframe title="Mums Backpackers location map" src="https://www.google.com/maps?output=embed&q=https%3A%2F%2Fmaps.app.goo.gl%2FntQM8yCe9xYh8z8r5" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full min-h-[300px] w-full border-0" /><a href="https://maps.app.goo.gl/ntQM8yCe9xYh8z8r5" target="_blank" rel="noreferrer" className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-3 text-xs font-bold text-forest-900 shadow-sm">Mums Backpackers · Diani Beach, Kenya</a></div></div></section>

      <section className="bg-gold-300 px-6 py-16 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-forest-800">Ready when you are</p><h2 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">Make yourself at home.</h2></div><Link href="/booking" className="group inline-flex w-fit items-center gap-3 rounded-full bg-forest-950 px-7 py-4 text-sm font-bold text-white transition-all hover:-translate-y-1 hover:bg-forest-800">Book your stay <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Link></div></section>

      <footer className="bg-forest-950 px-6 py-12 text-white lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 border-b border-white/10 pb-10 md:flex-row"><div><div className="font-display text-2xl">Mums Backpackers</div><p className="mt-3 max-w-xs text-sm leading-6 text-white/55">A warm, welcoming place to stay, rest, and make your own memories.</p></div>      <div className="flex flex-col gap-3 text-sm text-white/70"><a href="mailto:info@mumsbackpackers.com" className="transition-colors hover:text-gold-200">info@mumsbackpackers.com</a><Link href="/gallery" className="transition-colors hover:text-gold-200">Gallery <ArrowUpRight size={14} className="ml-1 inline" /></Link><Link href="/travel" className="transition-colors hover:text-gold-200">Car rental & safaris <ArrowUpRight size={14} className="ml-1 inline" /></Link><a href="/booking" className="transition-colors hover:text-gold-200">Booking & Contact <ArrowUpRight size={14} className="ml-1 inline" /></a><a href="/admin/login" className="transition-colors hover:text-gold-200">Admin login <ArrowUpRight size={14} className="ml-1 inline" /></a></div></div><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 pt-6 text-xs text-white/35 sm:flex-row"><span>© 2026 Mums Backpackers</span><span>Come as you are.</span></div></footer>
    </main>
  );
}
