import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StripeWebhookService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-08-16'
  });

  constructor(private prisma: PrismaService) {}

  async process(payload: Buffer, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subId = session.subscription as string;

      if (!userId) return { ok: true };

      const existing = await this.prisma.subscription.findFirst({
        where: { userId }
      });

      const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (existing) {
        await this.prisma.subscription.update({
          where: { id: existing.id },
          data: { plan: 'pro', status: 'active', providerRef: subId, validTill }
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            userId,
            plan: 'pro',
            status: 'active',
            provider: 'stripe',
            providerRef: subId,
            validTill
          }
        });
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { plan: 'pro' }
      });
    }

    return { received: true };
  }
}
