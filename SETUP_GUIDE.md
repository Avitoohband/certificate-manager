# Certificate Manager - Setup Guide

This guide will help you set up and run the Certificate Manager application locally.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Redis** 7+ ([Download](https://redis.io/download))
- **Docker & Docker Compose** (optional, for containerized setup)

---

## Quick Start (Docker)

The fastest way to get started:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd certificate-manager

# 2. Copy environment variables
cp .env.example .env

# 3. Generate encryption key
echo "MASTER_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)" >> .env

# 4. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# 5. Install backend dependencies
cd backend
npm install

# 6. Run database migrations
npm run migration:run

# 7. Start backend
npm run start:dev

# 8. In a new terminal, install frontend dependencies
cd ../frontend
npm install

# 9. Start frontend
npm run dev
```

Now open http://localhost:5173 in your browser!

---

## Manual Setup (Without Docker)

### Step 1: Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE certmanager;
\q
```

### Step 2: Redis Setup

```bash
# Start Redis (if not running)
redis-server

# Or on macOS with Homebrew:
brew services start redis

# Or on Linux:
sudo systemctl start redis
```

### Step 3: Environment Configuration

Create `.env` file in the project root:

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=certmanager

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=<generate-with: openssl rand -base64 32>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<generate-with: openssl rand -base64 32>
REFRESH_TOKEN_EXPIRES_IN=7d

# Master Encryption Key (IMPORTANT!)
MASTER_ENCRYPTION_KEY=<generate-with: openssl rand -base64 32>

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@certmanager.com
```

**⚠️ IMPORTANT**: The `MASTER_ENCRYPTION_KEY` is critical for encrypting private keys. **Never lose this key** or you won't be able to decrypt existing private keys!

### Step 4: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev

# Backend will be available at http://localhost:3000
```

### Step 5: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend will be available at http://localhost:5173
```

---

## Running Tests

### Backend Tests

```bash
cd backend

# Run unit tests
npm run test

# Run unit tests with coverage
npm run test:cov

# Run E2E tests (requires running database)
npm run test:e2e
```

### Frontend Tests (To be added)

```bash
cd frontend
npm run test
```

---

## Production Build

### Backend

```bash
cd backend

# Build
npm run build

# Start production server
npm run start:prod
```

### Frontend

```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview
```

### Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique secrets for JWT tokens
- [ ] Store `MASTER_ENCRYPTION_KEY` in a secure vault (AWS Secrets Manager, HashiCorp Vault)
- [ ] Set up SSL/TLS certificates for HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure email SMTP for notifications
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure logging (ELK Stack, CloudWatch)
- [ ] Enable rate limiting
- [ ] Review and harden security settings

---

## Database Migrations

### Create a new migration

```bash
cd backend
npm run migration:generate src/database/migrations/MigrationName
```

### Run migrations

```bash
npm run migration:run
```

### Revert last migration

```bash
npm run migration:revert
```

---

## Common Issues & Solutions

### Issue: "Connection refused" to PostgreSQL

**Solution**: 
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_HOST and DATABASE_PORT in `.env`
- Verify database exists: `psql -U postgres -l`

### Issue: "Connection refused" to Redis

**Solution**:
- Start Redis: `redis-server` or `sudo systemctl start redis`
- Check REDIS_HOST and REDIS_PORT in `.env`
- Test connection: `redis-cli ping` (should return "PONG")

### Issue: "MASTER_ENCRYPTION_KEY must be 32 bytes"

**Solution**:
- Generate a proper key: `openssl rand -base64 32`
- Ensure the key is base64-encoded
- Do not use spaces or special characters

### Issue: Migration errors

**Solution**:
- Ensure database is empty or drop existing tables
- Run: `npm run migration:run`
- If issues persist, revert and re-run migrations

### Issue: Frontend can't connect to backend

**Solution**:
- Ensure backend is running on port 3000
- Check CORS settings in backend `main.ts`
- Verify `FRONTEND_URL` in `.env`

---

## Project Structure Overview

```
certificate-manager/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   ├── common/       # Shared utilities
│   │   ├── jobs/         # Background jobs
│   │   ├── config/       # Configuration
│   │   └── main.ts       # Entry point
│   ├── test/             # E2E tests
│   └── package.json
├── frontend/             # React app
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   ├── store/        # State management
│   │   └── types/        # TypeScript types
│   └── package.json
├── docker-compose.yml    # Docker setup
├── .env                  # Environment variables
└── README.md             # Documentation
```

---

## Creating Your First Certificate

1. **Register an account**: Navigate to http://localhost:5173/register
2. **Login**: Use your credentials to log in
3. **Create certificate**: Click "New Certificate" button
4. **Fill in details**:
   - Common Name: `example.com`
   - Organization: `My Company`
   - Type: RSA 2048
   - Validity: 365 days
5. **Submit**: Click "Create Certificate"
6. **Download**: View your certificate and download it

---

## API Documentation

### Authentication

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Certificates

```bash
# Create certificate
curl -X POST http://localhost:3000/api/certificates \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commonName": "example.com",
    "organization": "My Company",
    "type": "rsa_2048",
    "validityDays": 365
  }'

# List certificates
curl -X GET http://localhost:3000/api/certificates \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get certificate details
curl -X GET http://localhost:3000/api/certificates/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Background Jobs

The application runs a daily job to check for expiring certificates.

### Manual job trigger (for testing)

You can trigger the expiration check manually using Redis CLI:

```bash
redis-cli
> LPUSH bull:certificates:check-expiration '{"data":{},"opts":{}}'
```

Or set up a cron job:

```typescript
// In certificates.module.ts, you can add:
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

// Add to service:
constructor(@InjectQueue('certificates') private queue: Queue) {
  // Schedule job every day at midnight
  this.queue.add('check-expiration', {}, {
    repeat: { cron: '0 0 * * *' }
  });
}
```

---

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive secrets
2. **Rotate secrets regularly** - Change JWT secrets periodically
3. **Use HTTPS in production** - Always encrypt traffic
4. **Backup encryption key** - Store `MASTER_ENCRYPTION_KEY` securely
5. **Review audit logs** - Check for suspicious activity
6. **Update dependencies** - Run `npm audit` regularly
7. **Limit API access** - Use rate limiting and RBAC
8. **Monitor certificate expiration** - Set up alerts

---

## Support & Troubleshooting

### Logs

Backend logs are output to console. In production, configure proper logging:

```typescript
// Add to main.ts
import { Logger } from '@nestjs/common';
const logger = new Logger('Bootstrap');
logger.log(`Application is running on: ${await app.getUrl()}`);
```

### Health Check

Add a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

### Database Connection Test

```bash
psql -U postgres -d certmanager -c "SELECT COUNT(*) FROM users;"
```

---

## Next Steps

1. ✅ Set up local development environment
2. ✅ Run tests to verify everything works
3. ✅ Create your first certificate
4. ✅ Explore the audit logs (admin role)
5. 📖 Read [CERTIFICATE_LIFECYCLE.md](./CERTIFICATE_LIFECYCLE.md) for lifecycle details
6. 🚀 Deploy to production (see Production Build section)

---

## Contributing

When contributing to this project:

1. Write tests for new features
2. Follow the existing code style
3. Update documentation
4. Create meaningful commit messages
5. Submit pull requests with clear descriptions

---

## License

MIT License - See LICENSE file for details

---

**Questions?** Open an issue on GitHub or contact the development team.

Happy certificate management! 🔐

