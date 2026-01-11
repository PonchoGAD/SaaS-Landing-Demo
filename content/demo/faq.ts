export type FAQItem = {
  q: string;
  a: string;
};

export const faq: FAQItem[] = [
  {
    q: 'Is this project production-ready?',
    a: 'Yes. The project is intentionally minimal, but built with production-oriented architecture and best practices.'
  },
  {
    q: 'Can this be extended into a real product?',
    a: 'Yes. This demo can be extended with server actions, backend APIs, authentication, and databases when needed.'
  },
  {
    q: 'Does it include a backend?',
    a: 'No. Backend logic is intentionally excluded to keep the demo focused on UX, structure, and SEO.'
  },
  {
    q: 'Why is everything so minimal?',
    a: 'Because the goal is clarity and speed. The project avoids unnecessary complexity and focuses on what matters.'
  }
];
