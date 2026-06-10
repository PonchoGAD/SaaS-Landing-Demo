import { notFound } from 'next/navigation';
import { getDictionary, type Locale } from '@/lib/i18n';

type Props = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;

  try {
    await getDictionary(locale as Locale);
  } catch {
    notFound();
  }

  return <>{children}</>;
}
