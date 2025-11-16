export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

export enum CertificateStatus {
  ACTIVE = 'active',
  EXPIRING = 'expiring',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum CertificateType {
  RSA_2048 = 'rsa_2048',
  RSA_4096 = 'rsa_4096',
  EC_P256 = 'ec_p256',
  EC_P384 = 'ec_p384',
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export interface Certificate {
  id: string;
  commonName: string;
  organization?: string;
  organizationUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  subjectAltNames: string[];
  type: CertificateType;
  status: CertificateStatus;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  revokedAt?: string;
  revocationReason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  owner?: User;
}

export interface CreateCertificateDto {
  commonName: string;
  organization?: string;
  organizationUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  subjectAltNames?: string[];
  type: CertificateType;
  validityDays?: number;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

