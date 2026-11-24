import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL.toString(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: new URL('/gallery', SITE_URL).toString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: new URL('/booking', SITE_URL).toString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: new URL('/travel', SITE_URL).toString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
