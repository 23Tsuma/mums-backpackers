'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, BedDouble, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type PublicProperty = {
  id: number;
  name: string;
  accommodationType: string;
  adultCapacity: number;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number | null;
  amenities: string[];
  images: Array<{ id: string; url: string; altText: string; isFeatured: boolean }>;
};

export default function PublicProperties() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/properties')
      .then(async (response) => {
        if (!response.ok) throw new Error('Public properties are unavailable.');
        return response.json() as Promise<{ properties: PublicProperty[] }>;
      })
      .then(({ properties: current }) => {
        if (active) setProperties(current);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => { active = false; };
  }, []);

  if (properties.length === 0 && !error) return null;

  return <section className="bg-cream-50 px-6 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Current listings</p><h2 className="section-title mt-4">Find your next<br /><span className="text-forest-700">place to stay.</span></h2></div><Link href="/booking" className="inline-flex items-center gap-2 text-sm font-bold text-forest-700 underline decoration-forest-200 underline-offset-8">Ask about availability <ArrowUpRight size={15} /></Link></div>{error ? <p className="rounded-xl bg-white p-5 text-sm text-ink-500" role="status">Property listings are temporarily unavailable.</p> : <div className="grid gap-6 md:grid-cols-2">{properties.map((property) => { const cover = property.images.find((image) => image.isFeatured) ?? property.images[0]; return <article key={property.id} className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_35px_rgba(26,61,42,0.06)]"><div className="relative aspect-[16/8] bg-sage-50">{cover ? <Image src={cover.url} alt={cover.altText || property.name} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center text-forest-700"><BedDouble size={32} strokeWidth={1.3} /></div>}</div><div className="p-6"><h3 className="font-display text-3xl text-forest-950">{property.name}</h3><p className="mt-1 text-xs font-medium text-gold-700">{property.accommodationType}</p><p className="mt-3 text-sm leading-6 text-ink-500">{property.description || 'A comfortable place to settle in and make your own.'}</p><div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-500"><span>{property.bedrooms} bedroom{property.bedrooms === 1 ? '' : 's'}</span><span>Up to {property.adultCapacity} adults</span>{property.bathrooms !== null && <span>{property.bathrooms} bathrooms</span>}{property.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{property.location}</span>}</div>{property.amenities.length > 0 && <p className="mt-3 text-xs leading-5 text-ink-400">{property.amenities.join(' · ')}</p>}<Link href="/booking" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-forest-700">Enquire about this property <ArrowUpRight size={15} /></Link></div></article>; })}</div>}</div></section>;
}
