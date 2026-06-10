import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { JwtAuthGuard } from '../../../../api/src/auth/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() req: any
  ) {
    return this.auth.login(body.email, body.password, {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  }

  @Post('refresh')
  async refresh(
    @Body('refreshToken') token: string,
    @Req() req: any
  ) {
    return this.auth.refresh(token, {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any) {
    const user = req.user as { userId: string };
    return this.auth.logout(user.userId);
  }
}
