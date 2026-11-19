'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, BedDouble } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

type PublicImage = { id: string; storage_path: string; alt_text: string };
type PublicProperty = { id: string; name: string; description: string; property_images: PublicImage[] };

export default function PublicProperties() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    getSupabaseClient().from('properties').select('id, name, description, property_images(id, storage_path, alt_text)').order('created_at', { ascending: false }).then(({ data }) => {
      if (active && data) setProperties(data as PublicProperty[]);
    });
    return () => { active = false; };
  }, []);

  if (!isSupabaseConfigured || properties.length === 0) return null;
  const supabase = getSupabaseClient();

  return <section className="bg-cream-50 px-6 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Current listings</p><h2 className="section-title mt-4">Find your next<br /><span className="text-forest-700">place to stay.</span></h2></div><Link href="/booking" className="inline-flex items-center gap-2 text-sm font-bold text-forest-700 underline decoration-forest-200 underline-offset-8">Ask about availability <ArrowUpRight size={15} /></Link></div><div className="grid gap-6 md:grid-cols-2">{properties.map((property) => { const cover = property.property_images[0]; const imageUrl = cover ? supabase.storage.from('property-images').getPublicUrl(cover.storage_path).data.publicUrl : ''; return <article key={property.id} className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_35px_rgba(26,61,42,0.06)]"><div className="relative aspect-[16/8] bg-sage-50">{imageUrl ? <img src={imageUrl} alt={cover?.alt_text || property.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-forest-700"><BedDouble size={32} strokeWidth={1.3} /></div>}</div><div className="p-6"><h3 className="font-display text-3xl text-forest-950">{property.name}</h3><p className="mt-3 text-sm leading-6 text-ink-500">{property.description || 'A comfortable place to settle in and make your own.'}</p><Link href="/booking" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-forest-700">Enquire about this property <ArrowUpRight size={15} /></Link></div></article>; })}</div></div></section>;
}
