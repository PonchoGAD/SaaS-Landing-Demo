import { plans } from '@/content/demo/pricing';

export default function PricingTable() {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`flex flex-col rounded-lg border p-8 ${
              plan.highlight
                ? 'border-primary shadow-sm'
                : 'border-border'
            }`}
          >
            <h3 className="text-lg font-semibold">{plan.name}</h3>

            <p className="mt-2 text-sm text-muted">
              {plan.description}
            </p>

            <p className="mt-6 text-4xl font-bold">
              {plan.price}
              <span className="ml-1 text-base font-normal text-muted">
                /one-time
              </span>
            </p>

            <ul className="mt-6 space-y-3 text-sm text-muted">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <a
                href="/contact"
                className={`block w-full rounded-md px-4 py-2 text-center text-sm font-medium ${
                  plan.highlight
                    ? 'bg-primary text-white hover:bg-black/80'
                    : 'border border-border text-primary hover:bg-muted'
                }`}
              >
                Get started
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted">
        No credit card required. Cancel anytime.
      </p>
    </section>
  );
}
