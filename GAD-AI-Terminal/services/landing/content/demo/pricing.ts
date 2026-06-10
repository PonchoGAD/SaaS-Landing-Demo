export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
};

export const plans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$15',
    description: 'For founders validating an idea',
    features: [
      'Single-page SaaS landing',
      'Responsive layout',
      'Basic SEO setup',
      'Clean, production-ready codebase',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    description: 'For teams ready to launch',
    features: [
      'Multi-page marketing site',
      'i18n (EN / RU)',
      'Advanced SEO metadata',
      'Scalable project structure',
      'Priority support',
    ],
    highlight: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: '$59',
    description: 'For custom or high-impact launches',
    features: [
      'Custom setup & architecture',
      'SEO strategy consultation',
      'Code review & optimization',
      'Post-launch guidance',
    ],
  },
];
