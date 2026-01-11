import { notFound } from 'next/navigation';
import { locales, getDictionary } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(params.locale as any)) notFound();

  const dict = await getDictionary(params.locale as any);

  return (
    <>
      <Header locale={params.locale} dict={dict} />
      <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>
      <Footer dict={dict} />
    </>
  );
}
