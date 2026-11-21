'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    src: '/images/gallery-terrace.jpg',
    alt: 'Furnished terrace with comfortable outdoor seating',
    label: 'Make room to unwind',
  },
  {
    src: '/images/gallery-lounge.jpg',
    alt: 'Furnished lounge with comfortable sofas and a bright sitting area',
    label: 'Settle in and feel at home',
  },
  {
    src: '/images/gallery-bedroom.jpg',
    alt: 'A furnished bedroom prepared for a restful stay',
    label: 'Rest easy',
  },
  {
    src: '/images/gallery-kitchen.jpg',
    alt: 'Furnished kitchen with dishes, counter space, and garden views',
    label: 'Everyday comforts',
  },
  {
    src: '/images/mums-backpackers-exterior.jpg',
    alt: 'Mums Backpackers surrounded by tropical greenery',
    label: 'Welcome to Mums Backpackers',
  },
];

export default function HeroSlideshow() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, []);

  function showPreviousSlide() {
    setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
  }

  function showNextSlide() {
    setActiveSlide((current) => (current + 1) % slides.length);
  }

  return (
    <div className="absolute inset-0" aria-label="Mums Backpackers photo slideshow">
      {slides.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          priority={index === 0}
          sizes="100vw"
          aria-hidden={index !== activeSlide}
          className={`object-cover object-center transition-opacity duration-1000 ${index === activeSlide ? 'opacity-60' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute bottom-7 right-6 z-10 flex items-center gap-2 sm:right-10">
        <span className="mr-2 hidden text-xs font-medium text-white/80 sm:inline" aria-live="polite">
          {slides[activeSlide].label}
        </span>
        <button
          type="button"
          onClick={showPreviousSlide}
          aria-label="Previous featured photo"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-forest-950/30 text-white transition-colors hover:bg-white hover:text-forest-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5 px-1" role="group" aria-label="Choose a featured photo">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show photo ${index + 1}: ${slide.label}`}
              aria-current={index === activeSlide ? 'true' : undefined}
              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${index === activeSlide ? 'w-6 bg-gold-200' : 'w-2 bg-white/70 hover:bg-white'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={showNextSlide}
          aria-label="Next featured photo"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-forest-950/30 text-white transition-colors hover:bg-white hover:text-forest-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
