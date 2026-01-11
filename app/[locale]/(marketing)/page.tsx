import Hero from '@/components/marketing/Hero';
import FeatureGrid from '@/components/marketing/FeatureGrid';

export default function HomePage() {
  return (
    <main className="space-y-32">
      <Hero />

      <section className="mx-auto max-w-6xl px-6">
        <FeatureGrid />
      </section>
    </main>
  );
}
