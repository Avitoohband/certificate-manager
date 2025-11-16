import { Injectable } from '@nestjs/common';
import * as forge from 'node-forge';
import { CertificateType } from '../../modules/certificates/entities/certificate.entity';

export interface CertificateRequest {
  commonName: string;
  organization?: string;
  organizationUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  subjectAltNames?: string[];
  validityDays: number;
  type: CertificateType;
}

export interface GeneratedCertificate {
  certificate: string; // PEM
  privateKey: string; // PEM
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
}

/**
 * Service for generating and managing X.509 certificates
 * Uses node-forge for cryptographic operations
 */
@Injectable()
export class CertificateCryptoService {
  /**
   * Generate a self-signed X.509 certificate
   */
  generateCertificate(request: CertificateRequest): GeneratedCertificate {
    // Generate key pair based on type
    const { publicKey, privateKey } = this.generateKeyPair(request.type);

    // Create certificate
    const cert = forge.pki.createCertificate();

    cert.publicKey = publicKey;
    cert.serialNumber = this.generateSerialNumber();

    const now = new Date();
    cert.validity.notBefore = now;
    cert.validity.notAfter = new Date(now.getTime() + request.validityDays * 24 * 60 * 60 * 1000);

    // Set subject
    const attrs = [{ name: 'commonName', value: request.commonName }];
    if (request.country) attrs.push({ name: 'countryName', value: request.country });
    if (request.state) attrs.push({ name: 'stateOrProvinceName', value: request.state });
    if (request.locality) attrs.push({ name: 'localityName', value: request.locality });
    if (request.organization) attrs.push({ name: 'organizationName', value: request.organization });
    if (request.organizationUnit) {
      attrs.push({ name: 'organizationalUnitName', value: request.organizationUnit });
    }

    cert.setSubject(attrs);
    cert.setIssuer(attrs); // Self-signed

    // Add extensions
    const extensions: any[] = [
      {
        name: 'basicConstraints',
        cA: false,
      },
      {
        name: 'keyUsage',
        keyCertSign: false,
        digitalSignature: true,
        keyEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
      },
    ];

    // Add Subject Alternative Names
    if (request.subjectAltNames && request.subjectAltNames.length > 0) {
      extensions.push({
        name: 'subjectAltName',
        altNames: request.subjectAltNames.map((name) => ({
          type: name.includes('@') ? 1 : 2, // 1=email, 2=DNS
          value: name,
        })),
      });
    }

    cert.setExtensions(extensions);

    // Sign certificate
    cert.sign(privateKey, forge.md.sha256.create());

    return {
      certificate: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(privateKey),
      serialNumber: cert.serialNumber,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
    };
  }

  /**
   * Parse and validate a PEM certificate
   */
  parseCertificate(pemCert: string): forge.pki.Certificate {
    return forge.pki.certificateFromPem(pemCert);
  }

  /**
   * Generate cryptographic key pair
   */
  private generateKeyPair(type: CertificateType): {
    publicKey: forge.pki.rsa.PublicKey;
    privateKey: forge.pki.rsa.PrivateKey;
  } {
    switch (type) {
      case CertificateType.RSA_2048:
        return forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
      case CertificateType.RSA_4096:
        return forge.pki.rsa.generateKeyPair({ bits: 4096, workers: -1 });
      case CertificateType.EC_P256:
      case CertificateType.EC_P384:
        // Note: node-forge has limited EC support, fall back to RSA 2048 for now
        // In production, use @peculiar/x509 or native crypto for EC keys
        console.warn(`EC keys not fully supported, using RSA 2048 instead`);
        return forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
      default:
        return forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
    }
  }

  /**
   * Generate a random serial number for certificate
   */
  private generateSerialNumber(): string {
    return Math.floor(Math.random() * 1000000000000000).toString(16);
  }
}
