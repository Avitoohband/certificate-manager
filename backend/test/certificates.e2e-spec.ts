import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CertificateType } from '../src/modules/certificates/entities/certificate.entity';

describe('CertificatesController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let certificateId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    // Register and login
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `cert-test-${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Cert',
        lastName: 'Tester',
      });

    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/certificates (POST)', () => {
    it('should create a new certificate', () => {
      return request(app.getHttpServer())
        .post('/api/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          commonName: 'test.example.com',
          organization: 'Test Organization',
          country: 'US',
          type: CertificateType.RSA_2048,
          validityDays: 365,
          subjectAltNames: ['www.test.example.com', 'api.test.example.com'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('commonName', 'test.example.com');
          expect(res.body).toHaveProperty('status', 'active');
          expect(res.body).toHaveProperty('serialNumber');
          expect(res.body).toHaveProperty('certificate');
          certificateId = res.body.id;
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/certificates')
        .send({
          commonName: 'test.example.com',
          type: CertificateType.RSA_2048,
        })
        .expect(401);
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          commonName: '', // Empty common name
          type: 'invalid-type',
        })
        .expect(400);
    });
  });

  describe('/api/certificates (GET)', () => {
    it('should return list of certificates', () => {
      return request(app.getHttpServer())
        .get('/api/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('certificates');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.certificates)).toBe(true);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/certificates?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/api/certificates?status=active')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('/api/certificates/:id (GET)', () => {
    it('should return certificate details', () => {
      return request(app.getHttpServer())
        .get(`/api/certificates/${certificateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', certificateId);
          expect(res.body).toHaveProperty('commonName');
          expect(res.body).toHaveProperty('certificate');
        });
    });

    it('should fail with non-existent certificate', () => {
      return request(app.getHttpServer())
        .get('/api/certificates/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/certificates/:id/download (GET)', () => {
    it('should download certificate', () => {
      return request(app.getHttpServer())
        .get(`/api/certificates/${certificateId}/download`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('certificate');
          expect(res.body).toHaveProperty('serialNumber');
          expect(res.body.certificate).toContain('BEGIN CERTIFICATE');
        });
    });
  });

  describe('/api/certificates/:id/private-key (GET)', () => {
    it('should return private key', () => {
      return request(app.getHttpServer())
        .get(`/api/certificates/${certificateId}/private-key`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('privateKey');
          expect(res.body.privateKey).toContain('BEGIN');
        });
    });
  });

  describe('/api/certificates/:id/renew (POST)', () => {
    it('should renew certificate', () => {
      return request(app.getHttpServer())
        .post(`/api/certificates/${certificateId}/renew`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.id).not.toBe(certificateId); // New certificate has new ID
          expect(res.body).toHaveProperty('commonName', 'test.example.com');
        });
    });
  });

  describe('/api/certificates/:id (PUT)', () => {
    it('should update certificate metadata', () => {
      return request(app.getHttpServer())
        .put(`/api/certificates/${certificateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          metadata: {
            environment: 'production',
            team: 'DevOps',
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.metadata).toEqual({
            environment: 'production',
            team: 'DevOps',
          });
        });
    });
  });

  describe('/api/certificates/:id (DELETE)', () => {
    it('should revoke certificate', () => {
      return request(app.getHttpServer())
        .delete(`/api/certificates/${certificateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          reason: 'Test revocation',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'revoked');
          expect(res.body).toHaveProperty('revocationReason', 'Test revocation');
        });
    });
  });
});

