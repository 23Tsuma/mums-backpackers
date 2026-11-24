'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Mail, MapPin, MessageCircle, Phone, Sparkles } from 'lucide-react';

type BookingResponse = {
  reference?: string;
  emailPending?: boolean;
  error?: string;
};

type ApartmentOption = {
  id: number;
  unitCode: string;
  name: string;
  adultCapacity: number;
  hasSittingRoom: boolean;
  available: boolean;
};

export default function BookingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState('');
  const [emailPending, setEmailPending] = useState(false);
  const [bookingIncludesChildren, setBookingIncludesChildren] = useState(false);
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [extraBeds, setExtraBeds] = useState(0);
  const idempotencyKey = useRef<string | null>(null);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const firstAllowedCheckout = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const checkoutMinimum = checkin && checkin >= today
    ? new Date(`${checkin}T00:00:00`)
    : new Date(firstAllowedCheckout);
  if (checkin && checkin >= today) checkoutMinimum.setDate(checkoutMinimum.getDate() + 1);
  const checkoutMin = `${checkoutMinimum.getFullYear()}-${String(checkoutMinimum.getMonth() + 1).padStart(2, '0')}-${String(checkoutMinimum.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (!checkin || !checkout || checkout <= checkin) {
      setApartments([]);
      setAvailabilityMessage(checkin && checkin < today ? 'Check-in date cannot be in the past.' : '');
      setAvailabilityLoading(false);
      return;
    }
    if (checkin < today || checkout < today) {
      setApartments([]);
      setUnitId(null);
      setAvailabilityMessage('Please choose dates that are today or later.');
      setAvailabilityLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityMessage('');

    fetch(`/api/availability?checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json() as { apartments?: ApartmentOption[]; error?: string };
        if (!response.ok) throw new Error(result.error || 'Could not check apartment availability.');
        if (!active) return;
        const options = result.apartments ?? [];
        setApartments(options);
        setUnitId((current) => options.some((apartment) => apartment.id === current && apartment.available) ? current : null);
      })
      .catch((requestError: unknown) => {
        if (!active || (requestError instanceof Error && requestError.name === 'AbortError')) return;
        setApartments([]);
        setAvailabilityMessage(requestError instanceof Error ? requestError.message : 'Could not check apartment availability.');
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [checkin, checkout, today]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const checkinInput = form.querySelector<HTMLInputElement>('input[name="checkin"]');
    const checkoutInput = form.querySelector<HTMLInputElement>('input[name="checkout"]');
    const childrenInput = form.querySelector<HTMLInputElement>('input[name="children"]');
    const extraBedsInput = form.querySelector<HTMLInputElement>('input[name="extraBeds"]');
    checkinInput?.setCustomValidity('');
    checkoutInput?.setCustomValidity('');
    extraBedsInput?.setCustomValidity('');

    if (checkinInput?.value && checkinInput.value < today) {
      checkinInput.setCustomValidity('Check-in date cannot be in the past.');
    } else if (checkoutInput?.value && checkoutInput.value < today) {
      checkoutInput.setCustomValidity('Check-out date cannot be in the past.');
    } else if (checkinInput?.value && checkoutInput?.value && checkoutInput.value <= checkinInput.value) {
      checkoutInput.setCustomValidity('Check-out date must be after the check-in date.');
    }
    if (Number(childrenInput?.value ?? 0) > 0 && Number(extraBedsInput?.value ?? 0) < 1) {
      extraBedsInput?.setCustomValidity('Request at least one additional bed for children.');
    } else if (Number(childrenInput?.value ?? 0) === 0 && Number(extraBedsInput?.value ?? 0) > 0) {
      extraBedsInput?.setCustomValidity('Additional beds are available only with a child request.');
    }

    if (!form.checkValidity()) {
      setError('Please correct the highlighted fields before sending your enquiry.');
      form.reportValidity();
      return;
    }

    setError('');
    setSubmitting(true);

    const requestId = idempotencyKey.current ?? crypto.randomUUID();
    idempotencyKey.current = requestId;

    try {
      const formData = new FormData(form);
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: requestId,
          unitId: Number(formData.get('unitId')),
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          checkin: formData.get('checkin'),
          checkout: formData.get('checkout'),
          adults: Number(formData.get('adults')),
          children: Number(formData.get('children')),
          extraBeds: Number(formData.get('extraBeds')),
          specialRequests: formData.get('message'),
          website: formData.get('website'),
        }),
      });

      const result = await response.json() as BookingResponse;
      if (!response.ok) {
        setError(result.error || 'We could not submit your booking request. Please try again.');
        return;
      }

      setBookingReference(result.reference ?? '');
      setEmailPending(Boolean(result.emailPending));
      setBookingIncludesChildren(Number(formData.get('children')) > 0);
      setSubmitted(true);
      idempotencyKey.current = null;
      form.reset();
      setCheckin('');
      setCheckout('');
      setApartments([]);
      setUnitId(null);
      setAdults(1);
      setChildren(0);
      setExtraBeds(0);
    } catch {
      setError('We could not submit your booking request. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 text-ink-900">
      <header className="border-b border-sage-200 bg-cream-50/95 px-6 lg:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between py-5"><Link href="/" className="group flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-forest-950 text-gold-200 transition-transform group-hover:rotate-12"><Sparkles size={17} /></span><span><span className="block font-display text-xl leading-none text-forest-950">Mums</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-700">Backpackers</span></span></Link><nav className="flex items-center gap-6 text-sm"><Link href="/gallery" className="hidden text-ink-500 transition-colors hover:text-forest-800 sm:block">Gallery</Link><Link href="/travel" className="hidden text-ink-500 transition-colors hover:text-forest-800 sm:block">Car rental & safaris</Link><Link href="/booking" className="font-semibold text-forest-900">Booking & Contact</Link></nav></div></header>
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 transition-colors hover:text-gold-700"><ArrowLeft size={16} /> Back to home</Link><div className="grid gap-14 lg:grid-cols-[1fr_0.7fr] lg:gap-24"><div><p className="eyebrow">Start your stay</p><h1 className="mt-5 max-w-2xl font-display text-5xl leading-[1.05] text-forest-950 sm:text-6xl">Book your stay at <em className="text-forest-700">Mums</em> Backpackers.</h1><p className="mt-7 max-w-xl text-lg leading-8 text-ink-600">Tell us a little about your plans and we&apos;ll get back to you with availability and next steps.</p><div className="mt-10 flex flex-wrap gap-3 text-sm text-ink-600"><span className="rounded-full bg-white px-4 py-2 shadow-sm"><CheckCircle2 size={15} className="mr-2 inline text-forest-700" />Warm, simple stays</span><span className="rounded-full bg-white px-4 py-2 shadow-sm"><CheckCircle2 size={15} className="mr-2 inline text-forest-700" />Personal response</span></div></div><aside className="rounded-2xl bg-forest-950 p-8 text-white shadow-xl sm:p-10"><p className="eyebrow text-gold-200">Get in touch</p><h2 className="mt-4 font-display text-3xl">Questions before you arrive?</h2><p className="mt-4 text-sm leading-6 text-white/60">We&apos;re happy to help with directions, room details, or local recommendations.</p><div className="mt-8 space-y-5 border-t border-white/15 pt-7"><a href="mailto:info@mumsbackpackers.com" className="flex items-center gap-3 text-sm text-white/80 transition-colors hover:text-gold-200"><Mail size={18} className="text-gold-200" /> info@mumsbackpackers.com</a><a href="tel:+25427863245" className="flex items-center gap-3 text-sm text-white/80 transition-colors hover:text-gold-200"><Phone size={18} className="text-gold-200" /> 0727863245</a><div className="flex items-center gap-3 text-sm text-white/80"><MapPin size={18} className="text-gold-200" /> Location details on request</div></div><a href="https://wa.me/25427863245" className="mt-9 flex items-center justify-center gap-2 rounded-full bg-gold-300 px-5 py-3.5 text-sm font-bold text-forest-950 transition-colors hover:bg-gold-200"><MessageCircle size={18} /> Message us on WhatsApp <ArrowUpRight size={15} /></a></aside></div>

        <section className="mt-20 max-w-4xl rounded-2xl bg-white p-6 shadow-[0_12px_50px_rgba(26,61,42,0.07)] sm:p-10 lg:mt-28">
          <div className="mb-9 border-b border-sage-200 pb-7">
            <p className="eyebrow">Enquiry form</p>
            <h2 className="mt-3 font-display text-3xl text-forest-950">Tell us about your stay</h2>
            <p className="mt-2 text-sm text-ink-500">Fields marked with * are required.</p>
          </div>
          {submitted ? (
            <div className="rounded-xl bg-sage-50 p-8 text-center" role="status">
              <CheckCircle2 size={42} className="mx-auto text-forest-700" />
              <h3 className="mt-4 font-display text-3xl text-forest-950">Thank you for your enquiry.</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-600">
                {emailPending
                  ? 'Your request has been saved, but email delivery is delayed. We will retry sending it.'
                  : 'Your request is pending confirmation. A confirmation email has been sent to the address provided.'}
                {bookingIncludesChildren && ' Requests for children and additional beds need administrator approval.'}
                {bookingReference && <> Booking reference: <strong>{bookingReference}</strong>.</>}
              </p>
              <button type="button" onClick={() => setSubmitted(false)} className="mt-6 text-sm font-bold text-forest-700 underline underline-offset-4">Send another enquiry</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-7">
              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                <label>Leave this field empty<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <div className="grid gap-7 sm:grid-cols-2">
                <label className="field-label">Your name *<input name="name" required minLength={2} maxLength={120} type="text" autoComplete="name" className="field-input" placeholder="e.g. Alex Morgan" /></label>
                <label className="field-label">Email address *<input name="email" required maxLength={254} type="email" autoComplete="email" className="field-input" placeholder="you@example.com" /></label>
                <label className="field-label">Phone number<input name="phone" maxLength={40} type="tel" autoComplete="tel" className="field-input" placeholder="Your best contact number" /></label>
                <label className="field-label">Adults *<select name="adults" required value={adults} onChange={(event) => setAdults(Number(event.target.value))} className="field-input"><option value={1}>1 adult</option><option value={2}>2 adults</option></select></label>
                <label className="field-label">Children *<input name="children" required type="number" min={0} max={3} value={children} onChange={(event) => { const count = Number(event.target.value); setChildren(count); if (count === 0) setExtraBeds(0); }} className="field-input" /><span className="mt-1 block text-xs text-ink-400">Up to 3 children; sleeping arrangements require approval.</span></label>
                <label className="field-label">Additional beds requested{children > 0 ? ' *' : ''}<input name="extraBeds" required={children > 0} type="number" min={children > 0 ? 1 : 0} max={children > 0 ? 3 : 0} value={extraBeds} onChange={(event) => setExtraBeds(Number(event.target.value))} className="field-input" /><span className="mt-1 block text-xs text-ink-400">Availability is subject to prior approval.</span></label>
                <label className="field-label">Check-in date *<input name="checkin" required type="date" min={today} value={checkin} onChange={(event) => { setCheckin(event.target.value); if (checkout && checkout <= event.target.value) setCheckout(''); setUnitId(null); }} className="field-input" /></label>
                <label className="field-label">Check-out date *<input name="checkout" required type="date" min={checkoutMin} value={checkout} onChange={(event) => { setCheckout(event.target.value); setUnitId(null); }} className="field-input" /></label>
              </div>
              <fieldset className="space-y-3" disabled={availabilityLoading}>
                <legend className="field-label">Choose an apartment *</legend>
                {!checkin || !checkout
                  ? <p className="text-sm text-ink-500">Choose your dates to check apartment availability.</p>
                  : availabilityLoading
                    ? <p className="text-sm text-ink-500">Checking availability…</p>
                    : apartments.map((apartment) => (
                      <label key={apartment.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${apartment.available ? 'border-sage-200' : 'cursor-not-allowed border-sage-100 opacity-50'}`}>
                        <input
                          required={apartment.available && unitId === null}
                          type="radio"
                          name="unitId"
                          value={apartment.id}
                          checked={unitId === apartment.id}
                          disabled={!apartment.available}
                          onChange={() => setUnitId(apartment.id)}
                          className="mt-1 accent-forest-800"
                        />
                        <span>
                          <span className="block font-semibold text-forest-950">{apartment.name}</span>
                          <span className="mt-1 block text-sm text-ink-500">
                            Up to {apartment.adultCapacity} adults · {apartment.hasSittingRoom ? 'sitting room available for approved child beds' : 'no sitting room'}
                            {!apartment.available && ' · unavailable for selected dates'}
                          </span>
                        </span>
                      </label>
                    ))}
                {availabilityMessage && <p className="text-sm text-ink-500" role="status">{availabilityMessage}</p>}
              </fieldset>
              <label className="field-label">Message or special requests<textarea name="message" maxLength={2000} rows={5} className="field-input resize-none" placeholder="Tell us anything that would help us prepare for your stay..." /></label>
              {error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm text-xs leading-5 text-ink-400">Your request is saved even if an email is temporarily delayed.</p>
                <button disabled={submitting || availabilityLoading || unitId === null} type="submit" className="group inline-flex items-center justify-center gap-3 rounded-full bg-forest-950 px-7 py-4 text-sm font-bold text-white transition-all hover:-translate-y-1 hover:bg-forest-800 disabled:cursor-wait disabled:opacity-60">
                  {submitting ? 'Submitting…' : 'Submit booking enquiry'}
                  {!submitting && <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
      <footer className="border-t border-sage-200 px-6 py-7 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 text-xs text-ink-400 sm:flex-row"><span>© 2026 Mums Backpackers</span><span>info@mumsbackpackers.com</span></div></footer>
    </main>
  );
}
