import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(OAuthProvider)
    private oauthRepository: Repository<OAuthProvider>,
  ) {}

  async create(createUserData: Partial<User>): Promise<User> {
    const existingUser = await this.findByEmail(createUserData.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.usersRepository.create(createUserData);
    return this.usersRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByOAuth(provider: string, providerId: string): Promise<User | null> {
    const oauthProvider = await this.oauthRepository.findOne({
      where: { provider: provider as any, providerId },
      relations: ['user'],
    });

    return oauthProvider?.user || null;
  }

  async createOAuthUser(email: string, profile: any): Promise<User> {
    const user = this.usersRepository.create({
      email,
      firstName: profile.firstName || profile.displayName?.split(' ')[0],
      lastName: profile.lastName || profile.displayName?.split(' ')[1],
      password: '', // OAuth users don't have passwords
      isActive: true,
    });

    return this.usersRepository.save(user);
  }

  async linkOAuthProvider(
    userId: string,
    provider: string,
    providerId: string,
    email: string,
    profile: any,
  ): Promise<OAuthProvider> {
    const oauthProvider = this.oauthRepository.create({
      userId,
      provider: provider as any,
      providerId,
      email,
      profile,
    });

    return this.oauthRepository.save(oauthProvider);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { lastLoginAt: new Date() });
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async findAll(page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.usersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { users, total };
  }
}
