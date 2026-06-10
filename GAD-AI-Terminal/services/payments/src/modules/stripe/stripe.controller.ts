import { Controller, Post, Req } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('payments')
export class StripeController {
  constructor(private stripe: StripeService) {}

  @Post('checkout')
  async checkout(@Req() req: any) {
    const user = req.user;
    const checkoutUrl = await this.stripe.createCheckoutSession({
      userId: user.id,
      locale: user.locale
    });
    return { checkoutUrl };
  }
}
