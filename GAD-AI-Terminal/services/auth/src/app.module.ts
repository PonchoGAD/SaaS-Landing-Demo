import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtStrategy } from './modules/auth/jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy]
})
export class AppModule {}
