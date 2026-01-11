export default function Hero() {
  return (
    <section className="py-32 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-primary">
        SaaS Landing Demo
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
        Clean, SEO-ready Next.js App Router MVP
      </p>

      <div className="mt-12">
        <a
          href="/pricing"
          className="rounded bg-primary px-8 py-3 text-white hover:bg-black/80"
        >
          View Pricing
        </a>
      </div>
    </section>
  );
}
