import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async validateCredentials(loginDto: LoginDto) {
    const authEmail = this.configService.get<string>('AUTH_EMAIL');
    const authPasswordHash = this.configService.get<string>('AUTH_PASSWORD_HASH');

    if (!authEmail || !authPasswordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const normalizedEmail = loginDto.email.toLowerCase().trim();
    const normalizedAuthEmail = authEmail.toLowerCase().trim();

    if (normalizedEmail !== normalizedAuthEmail) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, authPasswordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return { email: authEmail };
  }

  async generateToken(user: { email: string }) {
    const payload = {
      sub: user.email,
      email: user.email,
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN');

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn: expiresIn || '30d',
    });

    return token;
  }

  getCookieOptions() {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '30d';

    const maxAge = this.parseExpiresIn(expiresIn);

    return {
      httpOnly: true,
      sameSite: nodeEnv === 'production' ? 'none' : 'lax',
      secure: nodeEnv === 'production',
      maxAge,
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000; // default 30 days in ms
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      case 's':
        return value * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
