import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  /* ===================== REGISTER ===================== */

  async register(email: string, password: string) {
    const hash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
        password: hash,
        plan: 'free'
      }
    });
  }

  /* ===================== LOGIN ===================== */

  async login(
    email: string,
    password: string,
    meta: { userAgent?: string; ip?: string }
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException();
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException();

    const tokens = this.issueTokens(user.id, user.email);

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshHash: await bcrypt.hash(tokens.refreshToken, 10),
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return tokens;
  }

  /* ===================== REFRESH (ROTATION) ===================== */

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ip?: string }
  ) {
    const payload = this.jwt.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET
    });

    const session = await this.prisma.authSession.findFirst({
      where: {
        userId: payload.sub,
        revokedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) throw new UnauthorizedException();

    const valid = await bcrypt.compare(refreshToken, session.refreshHash);
    if (!valid) throw new UnauthorizedException();

    // 🔥 revoke old session
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) throw new UnauthorizedException();

    const tokens = this.issueTokens(user.id, user.email);

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshHash: await bcrypt.hash(tokens.refreshToken, 10),
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return tokens;
  }

  /* ===================== LOGOUT ===================== */

  async logout(userId: string) {
    await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  /* ===================== TOKENS ===================== */

  private issueTokens(userId: string, email: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      { expiresIn: '15m' }
    );

    const refreshToken = this.jwt.sign(
      { sub: userId },
      {
        expiresIn: '30d',
        secret: process.env.JWT_REFRESH_SECRET
      }
    );

    return { accessToken, refreshToken };
  }
}
