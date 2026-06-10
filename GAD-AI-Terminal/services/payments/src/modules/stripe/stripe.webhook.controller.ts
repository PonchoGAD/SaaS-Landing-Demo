import { Controller, Post, Req, Headers } from '@nestjs/common';
import { StripeWebhookService } from './stripe.webhook.service';

@Controller('payments/webhook')
export class StripeWebhookController {
  constructor(private webhook: StripeWebhookService) {}

  @Post()
  async handle(
    @Req() req: any,
    @Headers('stripe-signature') signature: string
  ) {
    return this.webhook.process(req.rawBody, signature);
  }
}
