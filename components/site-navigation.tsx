'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

type SitePage = 'home' | 'gallery' | 'travel' | 'booking';

const links: { href: string; label: string; page: SitePage }[] = [
  { href: '/', label: 'Home', page: 'home' },
  { href: '/gallery', label: 'Gallery', page: 'gallery' },
  { href: '/travel', label: 'Car rental & safaris', page: 'travel' },
  { href: '/booking', label: 'Booking & Contact', page: 'booking' },
];

export default function SiteNavigation({
  currentPage,
  variant = 'light',
}: {
  currentPage: SitePage;
  variant?: 'light' | 'dark';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isDark = variant === 'dark';
  const linkStyle = isDark
    ? 'text-white/75 hover:text-gold-200'
    : 'text-ink-500 hover:text-forest-800';
  const activeLinkStyle = isDark ? 'text-white' : 'text-forest-900';
  const mobileHoverStyle = isDark ? 'hover:bg-white/10' : 'hover:bg-sage-50';

  return (
    <div className="relative">
      <nav aria-label="Main navigation" className="hidden items-center gap-5 text-sm md:flex lg:gap-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={currentPage === link.page ? 'page' : undefined}
            className={`whitespace-nowrap transition-colors ${currentPage === link.page ? activeLinkStyle : linkStyle}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-site-navigation"
        onClick={() => setIsOpen((open) => !open)}
        className={`grid h-11 w-11 place-items-center rounded-lg transition-colors md:hidden ${
          isDark
            ? 'border border-white/30 text-white hover:bg-white/10'
            : 'border border-sage-200 bg-white text-forest-900 hover:bg-sage-50'
        }`}
      >
        {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {isOpen && (
        <nav
          id="mobile-site-navigation"
          aria-label="Mobile navigation"
          className={`absolute right-0 top-full z-50 mt-3 flex w-64 flex-col rounded-xl p-2 shadow-xl md:hidden ${
            isDark
              ? 'border border-white/15 bg-forest-950'
              : 'border border-sage-200 bg-white'
          }`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={currentPage === link.page ? 'page' : undefined}
              onClick={() => setIsOpen(false)}
              className={`rounded-lg px-4 py-3 text-sm transition-colors ${
                currentPage === link.page
                  ? `${activeLinkStyle} font-semibold`
                  : `${linkStyle} ${mobileHoverStyle}`
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
