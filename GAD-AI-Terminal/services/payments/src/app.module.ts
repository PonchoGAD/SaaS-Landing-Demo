import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { StripeService } from './modules/stripe/stripe.service';
import { StripeController } from './modules/stripe/stripe.controller';
import { StripeWebhookController } from './modules/stripe/stripe.webhook.controller';
import { StripeWebhookService } from './modules/stripe/stripe.webhook.service';

@Module({
  controllers: [StripeController, StripeWebhookController],
  providers: [PrismaService, StripeService, StripeWebhookService],
})
export class AppModule {}
