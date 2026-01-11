import { faq } from '@/content/demo/faq';

export default function FAQList() {
  return (
    <ul className="space-y-4">
      {faq.map(item => (
        <li key={item.q}>
          <p className="font-semibold">{item.q}</p>
          <p className="text-gray-600">{item.a}</p>
        </li>
      ))}
    </ul>
  );
}
