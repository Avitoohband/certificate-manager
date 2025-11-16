import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    password: 'hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    isActive: true,
    refreshToken: null as any,
    lastLoginAt: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    certificates: [],
    auditLogs: [],
  };

  const mockUsersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockOAuthRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(OAuthProvider), useValue: mockOAuthRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'test@example.com',
        password: 'hashedpassword',
      });

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.create).toHaveBeenCalled();
      expect(mockUsersRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('123');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { id: '123' } });
    });

    it('should return null if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, firstName: 'Jane' };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('123', { firstName: 'Jane' });

      expect(result.firstName).toBe('Jane');
      expect(mockUsersRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { firstName: 'Jane' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockUsersRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete('123');

      expect(mockUsersRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRefreshToken', () => {
    it('should update refresh token', async () => {
      await service.updateRefreshToken('123', 'new-refresh-token');

      expect(mockUsersRepository.update).toHaveBeenCalledWith('123', {
        refreshToken: 'new-refresh-token',
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      await service.updateLastLogin('123');

      expect(mockUsersRepository.update).toHaveBeenCalledWith('123', {
        lastLoginAt: expect.any(Date),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      mockUsersRepository.findAndCount.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({ users: [mockUser], total: 1 });
      expect(mockUsersRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });
});
