import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getDictionary, type Locale } from '@/lib/i18n';

type Props = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;

  const dict = await getDictionary(locale as Locale);

  return (
    <>
      <Header locale={locale} dict={dict} />
      <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>
      <Footer dict={dict} />
    </>
  );
}
