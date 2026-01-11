import { notFound } from 'next/navigation';
import en from '@/content/i18n/en';
import ru from '@/content/i18n/ru';

export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export async function getDictionary(locale: Locale) {
  switch (locale) {
    case 'en':
      return en;
    case 'ru':
      return ru;
    default:
      notFound();
  }
}
