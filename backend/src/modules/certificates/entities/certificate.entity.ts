import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

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

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  commonName: string;

  @Column({ nullable: true })
  organization: string;

  @Column({ nullable: true })
  organizationUnit: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  locality: string;

  @Column({ type: 'text', array: true, default: [] })
  subjectAltNames: string[];

  @Column({
    type: 'enum',
    enum: CertificateType,
    default: CertificateType.RSA_2048,
  })
  type: CertificateType;

  @Column({
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.ACTIVE,
  })
  status: CertificateStatus;

  @Column()
  serialNumber: string;

  @Column({ type: 'text' })
  certificate: string; // PEM encoded certificate

  @Column({ type: 'text' })
  encryptedPrivateKey: string; // AES-256-GCM encrypted private key

  @Column()
  privateKeyIV: string; // Initialization vector for encryption

  @Column()
  privateKeyTag: string; // Authentication tag for GCM

  @Column({ type: 'date' })
  validFrom: Date;

  @Column({ type: 'date' })
  validTo: Date;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revocationReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, (user) => user.certificates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed property
  get isExpiringSoon(): boolean {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return this.validTo <= thirtyDaysFromNow && this.validTo > new Date();
  }

  get isExpired(): boolean {
    return this.validTo < new Date();
  }
}

