import { faq } from '@/content/demo/faq';

export default function FAQList() {
  return (
    <section className="mx-auto max-w-3xl">
      <ul className="space-y-8">
        {faq.map(item => (
          <li key={item.q}>
            <p className="text-base font-semibold text-primary">
              {item.q}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {item.a}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
