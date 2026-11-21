'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const photos = [
  {
    src: '/images/gallery-terrace.jpg',
    alt: 'Outdoor terrace with comfortable seating and a large sun umbrella',
    title: 'A quiet moment outdoors',
    category: 'Outdoor spaces',
  },
  {
    src: '/images/gallery-lounge.jpg',
    alt: 'Bright open-plan lounge with sofas, a television, and kitchen counter',
    title: 'Relax and settle in',
    category: 'Living spaces',
  },
  {
    src: '/images/gallery-balcony-one.jpg',
    alt: 'Private balcony with a comfortable chair and potted plants',
    title: 'A little room to unwind',
    category: 'Outdoor spaces',
  },
  {
    src: '/images/gallery-balcony-two.jpg',
    alt: 'Shaded balcony seating surrounded by greenery',
    title: 'Fresh air and greenery',
    category: 'Outdoor spaces',
  },
  {
    src: '/images/gallery-bathroom.jpg',
    alt: 'Clean private bathroom with tiled walls and a shower',
    title: 'Simple comforts',
    category: 'Details',
  },
  {
    src: '/images/gallery-kitchen.jpg',
    alt: 'Well-equipped kitchen with a sink, dishes, and a garden view',
    title: 'A kitchen that feels like home',
    category: 'Living spaces',
  },
  {
    src: '/images/gallery-bedroom.jpg',
    alt: 'Comfortable bedroom with a neatly made bed and warm wooden details',
    title: 'Rest easy',
    category: 'Rooms',
  },
  {
    src: '/images/mums-backpackers-exterior.jpg',
    alt: 'Mums Backpackers exterior surrounded by tropical greenery',
    title: 'Welcome to Mums Backpackers',
    category: 'The property',
  },
];

export default function PhotoGallery() {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    if (selectedPhoto === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedPhoto(null);
      if (event.key === 'ArrowRight') setSelectedPhoto((current) => current === null ? null : (current + 1) % photos.length);
      if (event.key === 'ArrowLeft') setSelectedPhoto((current) => current === null ? null : (current - 1 + photos.length) % photos.length);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto]);

  return (
    <>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, index) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setSelectedPhoto(index)}
            aria-label={`View photo: ${photo.title}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-sage-50 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-300"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-forest-950/75 via-transparent to-transparent opacity-90 transition-opacity group-hover:opacity-100" />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gold-200">{photo.category}</span>
                <span className="mt-1 block font-display text-xl text-white">{photo.title}</span>
              </span>
              <span aria-hidden="true" className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/60 text-white transition-colors group-hover:bg-white group-hover:text-forest-950">+</span>
            </span>
          </button>
        ))}
      </div>

      {selectedPhoto !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/95 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedPhoto(null);
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            aria-label="Close photo viewer"
            className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 sm:right-8 sm:top-8"
          >
            <X size={22} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedPhoto((selectedPhoto - 1 + photos.length) % photos.length)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 sm:left-8"
          >
            <ChevronLeft size={24} />
          </button>
          <figure className="relative flex h-[min(74vh,760px)] w-full max-w-6xl flex-col items-center">
            <div className="relative min-h-0 w-full flex-1">
              <Image
                src={photos[selectedPhoto].src}
                alt={photos[selectedPhoto].alt}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
            <figcaption className="pt-4 text-center text-sm text-white/85">
              <span className="font-medium">{photos[selectedPhoto].title}</span>
              <span className="mx-2 text-white/40">·</span>
              <span className="text-white/55">{selectedPhoto + 1} / {photos.length}</span>
            </figcaption>
          </figure>
          <button
            type="button"
            onClick={() => setSelectedPhoto((selectedPhoto + 1) % photos.length)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 sm:right-8"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </>
  );
}
