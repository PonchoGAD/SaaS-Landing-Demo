import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-08-16'
    });
  }

  async createCheckoutSession(params: { userId: string; locale?: string }) {
    const priceId =
      params.locale === 'US'
        ? process.env.STRIPE_PRICE_US ?? 'price_us_pro'
        : process.env.STRIPE_PRICE_EU ?? 'price_eu_pro';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.WEB_URL}/result?paid=true`,
      cancel_url: `${process.env.WEB_URL}/result`,
      metadata: { userId: params.userId }
    });

    return session.url;
  }
}
