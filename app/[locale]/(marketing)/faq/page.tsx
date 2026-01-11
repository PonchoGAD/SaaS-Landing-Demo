import FAQList from '@/components/marketing/FAQList';

export const metadata = {
  title: 'FAQ',
};

export default function FAQPage() {
  return (
    <main className="py-32">
      <section className="mx-auto max-w-3xl px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Frequently Asked Questions
        </h1>

        <p className="mt-4 text-lg text-muted">
          Clear answers to common questions about the project.
        </p>
      </section>

      <section className="mt-20 px-6">
        <FAQList />
      </section>
    </main>
  );
}
