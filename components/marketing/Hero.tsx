export default function Hero() {
  return (
    <section className="py-36">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-primary">
          Launch your SaaS landing
          <br />
          without friction
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Launch a clean, SEO-ready SaaS landing in days, not weeks.
          Built with Next.js App Router and production-minded architecture.
        </p>

        <div className="mt-12 flex justify-center gap-4">
          <a
            href="/pricing"
            className="rounded-md bg-primary px-8 py-3 text-white hover:bg-black/80"
          >
            View pricing
          </a>

          <a
            href="/faq"
            className="rounded-md border border-border px-8 py-3 text-sm text-muted hover:text-primary"
          >
            Learn more
          </a>
        </div>
      </div>
    </section>
  );
}
