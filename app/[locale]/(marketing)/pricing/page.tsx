import PricingTable from '@/components/marketing/PricingTable';

export const metadata = {
  title: 'Pricing',
};

export default function PricingPage() {
  return (
    <main className="py-32">
      <section className="mx-auto max-w-3xl px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Pricing
        </h1>

        <p className="mt-4 text-lg text-muted">
          Simple, transparent pricing for early-stage SaaS products.
        </p>
      </section>

      <section className="mt-20 px-6">
        <PricingTable />
      </section>
    </main>
  );
}
