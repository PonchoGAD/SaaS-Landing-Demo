import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return locales.flatMap(locale => ([
    { url: `${base}/${locale}`, lastModified: new Date() },
    { url: `${base}/${locale}/pricing`, lastModified: new Date() },
    { url: `${base}/${locale}/faq`, lastModified: new Date() },
    { url: `${base}/${locale}/contact`, lastModified: new Date() },
  ]));
}
