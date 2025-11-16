# Certificate Manager Application

A production-ready certificate management system for issuing, storing, renewing, and revoking X.509 certificates with enterprise-grade security.

## 🚀 Tech Stack (Justified)

### Backend: **NestJS + TypeScript**
- **Why**: Built-in dependency injection, modular architecture, excellent TypeScript support
- **Security**: Native support for guards, interceptors, and validation pipes
- **Scalability**: Microservices-ready architecture

### Frontend: **React + TypeScript + Vite**
- **Why**: Component reusability, strong ecosystem, type safety
- **UI Library**: shadcn/ui (customizable, accessible components)
- **State**: React Query for server state, Zustand for client state

### Database: **PostgreSQL**
- **Why**: ACID compliance, strong JSON support for metadata, excellent for audit logs
- **ORM**: TypeORM (seamless NestJS integration, migrations, type safety)

### Certificate Handling: **node-forge**
- **Why**: Pure JavaScript implementation, supports RSA/EC keys, X.509 certificates
- **Security**: Industry-standard, well-audited library

### Background Jobs: **BullMQ + Redis**
- **Why**: Reliable job queue, scheduled jobs for expiration checks
- **Features**: Retry logic, job prioritization, monitoring

### Authentication: **Passport.js + JWT**
- **Local**: Email/password with bcrypt
- **OAuth2**: Google, GitHub strategies
- **Session**: Redis-backed sessions

### Key Storage: **Encrypted at rest**
- **Method**: AES-256-GCM encryption for private keys
- **Key Management**: Environment-based master key (production: use AWS KMS/Vault)

---

## 📁 Project Structure

```
certificate-manager/
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication & authorization
│   │   │   ├── certificates/  # Certificate CRUD & lifecycle
│   │   │   ├── users/         # User management
│   │   │   ├── audit/         # Audit logging
│   │   │   └── notifications/ # Email/webhook notifications
│   │   ├── config/            # Configuration management
│   │   ├── database/          # Migrations & seeds
│   │   ├── common/            # Shared utilities, guards, decorators
│   │   ├── jobs/              # Background job processors
│   │   └── main.ts            # Application entry point
│   ├── test/                  # E2E tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API clients
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Helper functions
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml          # Local development setup
├── .env.example                # Environment variables template
└── README.md                   # This file
```

---

## 🔐 Security Features

1. **Private Key Encryption**: AES-256-GCM with unique IVs
2. **Password Hashing**: bcrypt (cost factor: 12)
3. **JWT Tokens**: Short-lived access tokens, refresh token rotation
4. **Rate Limiting**: Prevent brute-force attacks
5. **Audit Logs**: Immutable records of all operations
6. **RBAC**: Role-based access control (Admin, User, Viewer)
7. **Input Validation**: Class-validator on all DTOs
8. **SQL Injection Protection**: TypeORM parameterized queries

---

## 🔄 Certificate Lifecycle

```
┌─────────────┐
│   CREATE    │  Generate key pair + CSR → Issue certificate
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   ACTIVE    │  Certificate valid and in use
└──────┬──────┘
       │
       ├──────────────────────────────────┐
       │                                   │
       ▼                                   ▼
┌─────────────┐                    ┌─────────────┐
│  EXPIRING   │  < 30 days left    │   REVOKED   │  Manually revoked
└──────┬──────┘                    └─────────────┘
       │
       ▼
┌─────────────┐
│  EXPIRED    │  Past expiration date
└─────────────┘
```

**Background Job**: Runs daily to check for expiring certificates (< 30 days)
and sends notifications.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd certificate-manager

# Start infrastructure
docker-compose up -d

# Backend setup
cd backend
npm install
npm run migration:run
npm run start:dev

# Frontend setup
cd ../frontend
npm install
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/certmanager

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Encryption (for private keys)
MASTER_ENCRYPTION_KEY=generate-a-secure-32-byte-key

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

---

## 📊 Database Schema

See `backend/src/database/migrations/` for full schema.

**Core Tables**:
- `users` - User accounts
- `certificates` - Certificate metadata & encrypted private keys
- `audit_logs` - Immutable audit trail
- `oauth_providers` - OAuth2 linked accounts

---

## 🧪 Testing

```bash
# Backend unit tests
cd backend
npm run test

# Backend e2e tests
npm run test:e2e

# Frontend tests
cd frontend
npm run test
```

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/google` - OAuth2 login (Google)

### Certificates
- `GET /api/certificates` - List all certificates (paginated)
- `POST /api/certificates` - Create new certificate
- `GET /api/certificates/:id` - Get certificate details
- `PUT /api/certificates/:id` - Update certificate metadata
- `DELETE /api/certificates/:id` - Revoke certificate
- `POST /api/certificates/:id/renew` - Renew certificate
- `GET /api/certificates/:id/download` - Download certificate

### Audit
- `GET /api/audit` - Query audit logs (Admin only)

---

## 🚢 Deployment

Production deployment recommendations:
- **Container Registry**: AWS ECR / Docker Hub
- **Orchestration**: Kubernetes / AWS ECS
- **Secrets**: AWS Secrets Manager / HashiCorp Vault
- **CDN**: CloudFront for frontend
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack / AWS CloudWatch

---

## 📄 License

MIT


