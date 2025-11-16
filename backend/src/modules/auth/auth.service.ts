import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: User, ipAddress?: string, userAgent?: string) {
    const tokens = await this.generateTokens(user);

    // Update refresh token in database
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Audit log
    await this.auditService.log({
      action: AuditAction.USER_LOGIN,
      userId: user.id,
      ipAddress,
      userAgent,
      success: true,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Audit log
    await this.auditService.log({
      action: AuditAction.USER_CREATED,
      userId: user.id,
      ipAddress,
      userAgent,
      success: true,
    });

    return this.login(user, ipAddress, userAgent);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);

    await this.auditService.log({
      action: AuditAction.USER_LOGOUT,
      userId,
      success: true,
    });
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN') || '7d',
    });

    return {
      accessToken,
      refreshToken: await bcrypt.hash(refreshToken, 10),
    };
  }

  async validateOAuthUser(
    provider: string,
    providerId: string,
    email: string,
    profile: any,
  ): Promise<User> {
    let user = await this.usersService.findByOAuth(provider, providerId);

    if (!user) {
      // Try to find by email
      user = await this.usersService.findByEmail(email);

      if (!user) {
        // Create new user
        user = await this.usersService.createOAuthUser(email, profile);
      }

      // Link OAuth provider
      await this.usersService.linkOAuthProvider(user.id, provider, providerId, email, profile);
    }

    return user;
  }
}

