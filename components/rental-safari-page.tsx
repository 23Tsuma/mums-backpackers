'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Compass, MapPin, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SiteNavigation from '@/components/site-navigation';

const vehicles = [
  { name: '7L Van (Chauffeur Driven)', image: '/images/rentals/7l-van.png', type: 'Chauffeur-driven van', description: 'A comfortable option for airport transfers, group trips, and exploring the coast together.' },
  { name: 'Landcruiser Safari Van', image: '/images/rentals/landcruiser-safari-van.png', type: 'Safari vehicle', description: 'A purpose-ready safari van for wildlife drives and longer overland journeys.' },
  { name: 'Harrier / Lexus', image: '/images/rentals/harrier-lexus.png', type: 'Comfort car', description: 'A refined ride for coast transfers, day trips, and private journeys.' },
  { name: 'Motorbike (Motocross)', image: '/images/rentals/motocross-motorbike.png', type: 'Motorbike', description: 'A motocross bike for riders looking for a more independent way to get around.' },
  { name: 'Rav 4 / XTrail / Mazda 5CX', image: '/images/rentals/rav4-xtrail-mazda-cx5.png', type: 'SUV', description: 'Versatile SUV options for coastal drives and flexible day trips.' },
  { name: 'Medium', image: '/images/rentals/medium-car.png', type: 'Everyday car', description: 'A practical mid-size vehicle for getting around at your own pace.' },
  { name: 'Noah / Voxy', image: '/images/rentals/noah-voxy.png', type: 'Family van', description: 'A roomy van option for family travel and small groups.' },
  { name: 'Saloon Cars', image: '/images/rentals/saloon-cars.png', type: 'Saloon', description: 'Comfortable cars for town travel, transfers, and everyday journeys.' },
  { name: 'Prado TX', image: '/images/rentals/prado-tx.png', type: '4x4', description: 'A capable 4x4 choice for longer trips and safari adventures.' },
];

const destinations = [
  'Tsavo East (Land of Red Elephants)',
  'Shimba Hills Reserve (Day Trip)',
  'Tsavo West & Mzima Springs',
  'Maasai Mara (Fly-in Safari)',
  'Amboseli',
  'Kisite Mpunguti',
  'Wasini Island',
  'Malindi',
];

const durations = ['1-Day Excursion', '2 Days, 1 Night', '3 Days, 2 Nights', 'Custom Extension'];

type SubmitResult = { error?: string };

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function RentalSafariPage() {
  const [duration, setDuration] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [rentalSubmitted, setRentalSubmitted] = useState(false);
  const [rentalSubmitting, setRentalSubmitting] = useState(false);
  const [rentalError, setRentalError] = useState('');

  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData(form);
      const response = await fetch('/api/safari-enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadExplorer: formData.get('leadExplorer'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          destination: formData.get('destination'),
          targetDate: formData.get('targetDate'),
          travelers: Number(formData.get('travelers')),
          duration: formData.get('duration'),
          customExtension: String(formData.get('customExtension') ?? ''),
          dianiAccommodation: formData.get('dianiAccommodation'),
          website: formData.get('website'),
        }),
      });
      const result = await response.json() as SubmitResult;
      if (!response.ok) throw new Error(result.error || 'Your safari enquiry could not be sent.');
      form.reset();
      setDuration('');
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Your safari enquiry could not be sent.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRentalEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicle) return;
    const form = event.currentTarget;
    setRentalSubmitting(true);
    setRentalError('');
    try {
      const formData = new FormData(form);
      const response = await fetch('/api/vehicle-rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: selectedVehicle,
          name: formData.get('renterName'),
          telephone: formData.get('telephone'),
          email: formData.get('renterEmail'),
          pickupDate: formData.get('pickupDate'),
          durationDays: Number(formData.get('durationDays')),
        }),
      });
      const result = await response.json() as SubmitResult;
      if (!response.ok) throw new Error(result.error || 'Your vehicle rental request could not be sent.');
      form.reset();
      setRentalSubmitted(true);
    } catch (requestError) {
      setRentalError(requestError instanceof Error ? requestError.message : 'Your vehicle rental request could not be sent.');
    } finally {
      setRentalSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 text-ink-900">
      <header className="border-b border-sage-200 bg-cream-50/95 px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-5">
          <Link href="/" className="group flex items-center gap-3" aria-label="Mums Backpackers home">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-950 text-gold-200 transition-transform group-hover:rotate-12"><Sparkles size={17} /></span>
            <span><span className="block font-display text-xl leading-none text-forest-950">Mums</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-700">Backpackers</span></span>
          </Link>
          <SiteNavigation currentPage="travel" />
          <a href="#safari-enquiry" className="hidden items-center gap-2 rounded-full bg-forest-950 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-forest-800 md:inline-flex">Plan a trip <ArrowUpRight size={14} /></a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-forest-950 px-6 py-20 text-white lg:px-10 lg:py-28">
        <div aria-hidden="true" className="absolute -right-24 -top-32 h-96 w-96 rounded-full border border-gold-200/20" />
        <div className="relative mx-auto max-w-7xl">
          <Link href="/" className="mb-9 inline-flex items-center gap-2 text-sm font-semibold text-gold-200 hover:text-white"><ArrowLeft size={16} /> Back to Mums</Link>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.7fr] lg:items-end">
            <div><p className="eyebrow text-gold-200">Coast roads & wild places</p><h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">Your next journey starts <em className="text-gold-200">here.</em></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">Find a vehicle for the road or tell our Expedition Desk what kind of safari you have in mind. We&apos;ll help you plan the details.</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6"><Compass size={23} className="text-gold-200" /><h2 className="mt-4 font-display text-2xl">Explore from Diani</h2><p className="mt-2 text-sm leading-6 text-white/60">Private vehicle enquiries and safari planning, with Mums as your welcoming base.</p><a href="#vehicles" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-gold-200 hover:text-white">Browse vehicles <ArrowUpRight size={15} /></a></div>
          </div>
        </div>
      </section>

      <section id="vehicles" className="px-6 py-20 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">On the road</p><h2 className="section-title mt-4">Car & motorbike rental.</h2></div><p className="max-w-md text-sm leading-6 text-ink-500">Choose the vehicle that suits your journey, then contact us for availability, pricing, and rental details.</p></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => <article key={vehicle.name} className="overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
              <div className="relative h-52 bg-cream-50 p-5"><Image src={vehicle.image} alt={vehicle.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-contain p-4" /></div>
              <div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-700">{vehicle.type}</p><h3 className="mt-2 font-display text-2xl text-forest-950">{vehicle.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-ink-500">{vehicle.description}</p><button type="button" onClick={() => { setSelectedVehicle(vehicle.name); setRentalSubmitted(false); setRentalError(''); }} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-forest-800 underline decoration-sage-300 underline-offset-4 hover:text-gold-700">Rent vehicle <ArrowUpRight size={15} /></button></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div id="safari-enquiry" className="scroll-mt-8 lg:sticky lg:top-8">
            <p className="eyebrow">Expedition Desk</p><h2 className="section-title mt-4">Plan your safari.</h2><p className="mt-5 text-base leading-7 text-ink-600">Share a few details about your trip. Our team will follow up to discuss availability and a plan that fits your dates.</p>
            <div className="mt-8 space-y-4 rounded-2xl bg-forest-950 p-6 text-white"><div className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-gold-200" /><p className="text-sm leading-6 text-white/75">Choose a destination and target date; we&apos;ll help with the next steps.</p></div><p className="border-t border-white/15 pt-4 text-xs leading-5 text-white/50">Safari arrangements and pricing are confirmed individually after we review your enquiry.</p></div>
          </div>
          <div className="rounded-2xl border border-sage-100 bg-cream-50 p-6 sm:p-9">
            <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-700">Expedition Desk</p><h3 className="mt-2 font-display text-3xl text-forest-950">Plan Your Safari</h3></div>
            {submitted ? <div role="status" className="rounded-xl bg-sage-50 p-7 text-center"><CheckCircle2 size={40} className="mx-auto text-forest-700" /><h4 className="mt-4 font-display text-2xl text-forest-950">Your enquiry is with us.</h4><p className="mt-2 text-sm leading-6 text-ink-600">Thank you. Our team will be in touch to discuss your safari plans.</p><button type="button" onClick={() => setSubmitted(false)} className="mt-5 text-sm font-bold text-forest-800 underline underline-offset-4">Send another enquiry</button></div>
              : <form onSubmit={submitEnquiry} className="space-y-5">
                <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><label>Leave this field empty<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label></div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="field-label">Lead Explorer *<input name="leadExplorer" required minLength={2} maxLength={120} autoComplete="name" className="field-input" placeholder="Your full name" /></label>
                  <label className="field-label">Email address *<input name="email" required type="email" maxLength={254} autoComplete="email" className="field-input" placeholder="you@example.com" /></label>
                  <label className="field-label">Phone number<input name="phone" type="tel" maxLength={40} autoComplete="tel" className="field-input" placeholder="Your best contact number" /></label>
                  <label className="field-label">Preferred Destination *<select name="destination" required defaultValue="" className="field-input"><option value="" disabled>Select destination...</option>{destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}</select></label>
                  <label className="field-label">Target Date *<input name="targetDate" required type="date" min={localDateString(new Date())} className="field-input" /></label>
                  <label className="field-label">Travelers *<input name="travelers" required type="number" min={1} max={20} defaultValue={2} className="field-input" /></label>
                  <label className="field-label sm:col-span-2">Duration *<select name="duration" required value={duration} onChange={(event) => setDuration(event.target.value)} className="field-input"><option value="" disabled>Select duration...</option>{durations.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                  {duration === 'Custom Extension' && <label className="field-label sm:col-span-2">Describe your custom extension *<textarea name="customExtension" required maxLength={500} rows={3} className="field-input resize-y" placeholder="Share your preferred length or itinerary ideas" /></label>}
                  <label className="field-label sm:col-span-2">Current Accommodations in Diani<textarea name="dianiAccommodation" maxLength={500} rows={3} className="field-input resize-y" placeholder="Where are you currently staying in Diani? (optional)" /></label>
                </div>
                {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
                <div className="flex flex-col gap-3 border-t border-sage-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xs text-xs leading-5 text-ink-400">This form sends a planning request; your trip is not booked until our team confirms it.</p><button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-forest-950 px-6 py-3.5 text-sm font-bold text-white hover:bg-forest-800 disabled:opacity-60">{submitting ? 'Sending…' : 'Send safari enquiry'} {!submitting && <ArrowUpRight size={16} />}</button></div>
              </form>}
          </div>
        </div>
      </section>

      <footer className="bg-forest-950 px-6 py-10 text-white lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-display text-xl">Mums Backpackers</p><p className="mt-1 text-xs text-white/50">Your home base for the coast and beyond.</p></div><div className="flex flex-wrap gap-5 text-sm text-white/70"><Link href="/" className="hover:text-gold-200">Home</Link><Link href="/booking" className="hover:text-gold-200">Booking & Contact</Link><a href="mailto:info@mumsbackpackers.com" className="hover:text-gold-200">Get in touch</a></div></div></footer>
      <Dialog open={selectedVehicle !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedVehicle(null);
          setRentalError('');
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-sage-200 bg-white text-ink-900 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl text-forest-950">Rent {selectedVehicle}</DialogTitle>
            <DialogDescription>Share your details and requested dates. Our team will follow up to confirm availability and pricing.</DialogDescription>
          </DialogHeader>
          {rentalSubmitted ? <div role="status" className="rounded-xl bg-sage-50 p-7 text-center"><CheckCircle2 size={40} className="mx-auto text-forest-700" /><h3 className="mt-4 font-display text-2xl text-forest-950">Request received.</h3><p className="mt-2 text-sm leading-6 text-ink-600">We&apos;ll contact you to confirm the vehicle and rental details.</p></div>
            : <form onSubmit={submitRentalEnquiry} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="field-label">Client name *<input name="renterName" required minLength={2} maxLength={120} autoComplete="name" className="field-input" placeholder="Your full name" /></label>
                <label className="field-label">Telephone number *<input name="telephone" required type="tel" minLength={7} maxLength={40} autoComplete="tel" className="field-input" placeholder="+254 ..." /></label>
                <label className="field-label sm:col-span-2">Email address *<input name="renterEmail" required type="email" maxLength={254} autoComplete="email" className="field-input" placeholder="you@example.com" /></label>
                <label className="field-label">Picking date *<input name="pickupDate" required type="date" min={localDateString(new Date())} className="field-input" /></label>
                <label className="field-label">Duration (days) *<input name="durationDays" required type="number" min={1} max={90} defaultValue={1} className="field-input" /></label>
              </div>
              {rentalError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{rentalError}</p>}
              <button type="submit" disabled={rentalSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-950 px-6 py-3.5 text-sm font-bold text-white hover:bg-forest-800 disabled:opacity-60">{rentalSubmitting ? 'Sending…' : 'Send rental request'} {!rentalSubmitting && <ArrowUpRight size={16} />}</button>
            </form>}
        </DialogContent>
      </Dialog>
    </main>
  );
}
