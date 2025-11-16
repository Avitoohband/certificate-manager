# Certificate Lifecycle Management Plan

## Overview

This document describes the complete lifecycle of certificates in the Certificate Manager Application, including state transitions, automated processes, and manual operations.

---

## Certificate States

### 1. **ACTIVE**
- **Description**: Certificate is valid and currently in use
- **Characteristics**:
  - Current date is between `validFrom` and `validTo`
  - More than 30 days until expiration
  - Not revoked
- **Available Operations**: View, Update Metadata, Download, Revoke, Renew

### 2. **EXPIRING**
- **Description**: Certificate is still valid but will expire soon
- **Characteristics**:
  - Less than 30 days until expiration
  - Not yet expired
  - Triggers email notifications
- **Available Operations**: View, Download, Renew, Revoke
- **Automated Actions**: Daily email reminders to owner

### 3. **EXPIRED**
- **Description**: Certificate has passed its expiration date
- **Characteristics**:
  - Current date > `validTo`
  - No longer cryptographically valid
- **Available Operations**: View, Download (for archival), Renew
- **Restrictions**: Cannot be used for new connections

### 4. **REVOKED**
- **Description**: Certificate has been manually revoked before expiration
- **Characteristics**:
  - `revokedAt` timestamp is set
  - `revocationReason` is recorded
  - Cannot be un-revoked
- **Available Operations**: View, Download (for audit)
- **Restrictions**: Cannot be renewed

---

## State Transition Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                     Certificate Created                      │
│                                                               │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    ACTIVE    │◄─────────────┐
                    │              │              │
                    │  Valid for   │              │
                    │  >30 days    │              │
                    └──────┬───────┘              │
                           │                      │
                           │ (Auto: Daily Job)    │
                           │ When <30 days left   │
                           ▼                      │
                    ┌──────────────┐              │
                    │   EXPIRING   │              │
                    │              │         RENEW (Manual)
                    │  <30 days    │         Creates new
                    │  remaining   │         certificate
                    └──────┬───────┘              │
                           │                      │
                           │ (Auto: Daily Job)    │
                           │ When expired         │
                           ▼                      │
                    ┌──────────────┐              │
                    │   EXPIRED    │──────────────┘
                    │              │
                    │ Past expiry  │
                    └──────────────┘

         REVOKE (Manual)
         at any time
              │
              ▼
       ┌──────────────┐
       │   REVOKED    │
       │              │
       │  Cannot be   │
       │  renewed     │
       └──────────────┘
```

---

## Automated Processes

### 1. Daily Expiration Check Job

**Schedule**: Runs every day at midnight (UTC)

**Process**:
1. Query all certificates with `status = ACTIVE` and `validTo < now + 30 days`
2. Update their status to `EXPIRING`
3. Query all certificates with `status = ACTIVE` and `validTo < now`
4. Update their status to `EXPIRED`
5. Send email notifications to certificate owners

**Implementation**: BullMQ job processor (`CertificateExpirationProcessor`)

**Notifications Sent**:
- Certificates expiring in 30 days: "Your certificate will expire in 30 days"
- Certificates expiring in 14 days: "Your certificate will expire in 14 days"
- Certificates expiring in 7 days: "URGENT: Your certificate will expire in 7 days"
- Certificates expiring in 1 day: "CRITICAL: Your certificate expires tomorrow"

### 2. Status Update Logic

```typescript
// Update ACTIVE → EXPIRING
UPDATE certificates 
SET status = 'expiring' 
WHERE status = 'active' 
  AND validTo <= NOW() + INTERVAL '30 days'
  AND validTo > NOW();

// Update ACTIVE → EXPIRED
UPDATE certificates 
SET status = 'expired' 
WHERE status = 'active' 
  AND validTo < NOW();
```

---

## Manual Operations

### 1. Create Certificate

**Endpoint**: `POST /api/certificates`

**Process**:
1. Validate input (Common Name, Organization, validity days, etc.)
2. Generate RSA/EC key pair using `node-forge`
3. Create self-signed X.509 certificate with requested parameters
4. Encrypt private key using AES-256-GCM
5. Store certificate, encrypted private key, and metadata in database
6. Set status to `ACTIVE`
7. Log creation in audit logs
8. Send email notification to owner

**Security**:
- Private key never stored in plaintext
- Each private key encrypted with unique IV
- GCM authentication tag ensures integrity

### 2. View Certificate

**Endpoint**: `GET /api/certificates/:id`

**Access Control**:
- Users can only view their own certificates
- Admins can view all certificates

**Audit**: Logged as `CERT_VIEWED`

### 3. Download Certificate

**Endpoint**: `GET /api/certificates/:id/download`

**Returns**: PEM-encoded certificate and serial number

**Use Cases**:
- Install on web servers
- Share with third parties
- Archival purposes

**Audit**: Logged as `CERT_DOWNLOADED`

### 4. Access Private Key

**Endpoint**: `GET /api/certificates/:id/private-key`

**Process**:
1. Verify user ownership
2. Decrypt private key using master encryption key
3. Return PEM-encoded private key
4. **CRITICAL AUDIT**: Logged as `PRIVATE_KEY_ACCESSED`

**Security Considerations**:
- Highly sensitive operation
- Should require additional authentication (2FA) in production
- All accesses are logged for compliance

### 5. Renew Certificate

**Endpoint**: `POST /api/certificates/:id/renew`

**Process**:
1. Fetch existing certificate
2. Verify it's not revoked (expired certificates can be renewed)
3. Mark old certificate as `EXPIRED`
4. Create new certificate with:
   - Same Common Name, Organization, SANs
   - Same key type (RSA/EC)
   - New validity period (365 days by default)
   - New serial number
   - Fresh key pair
5. Return new certificate
6. Log renewal linking old and new certificate IDs

**Business Logic**:
- Preserves certificate metadata
- Creates audit trail linking old → new
- Old certificate kept for historical records

### 6. Revoke Certificate

**Endpoint**: `DELETE /api/certificates/:id`

**Process**:
1. Verify user ownership
2. Set `status = REVOKED`
3. Set `revokedAt = NOW()`
4. Record `revocationReason`
5. Log revocation in audit logs

**Common Revocation Reasons**:
- Key compromise
- Certificate misuse
- Superseded by new certificate
- Organization change
- Decommissioned service

**Note**: In production, this should also publish to a CRL (Certificate Revocation List) or OCSP responder.

### 7. Update Metadata

**Endpoint**: `PUT /api/certificates/:id`

**Allows**: Updating custom metadata only (not certificate cryptographic data)

**Use Cases**:
- Add tags (e.g., "production", "staging")
- Associate with projects or teams
- Add notes or documentation links

---

## Notification Strategy

### Email Triggers

1. **Certificate Created**
   - Sent immediately upon creation
   - Includes expiration date

2. **Expiring in 30 days**
   - First warning
   - Includes renewal link

3. **Expiring in 14 days**
   - Second warning
   - More urgent tone

4. **Expiring in 7 days**
   - Third warning
   - Marked as "URGENT"

5. **Expiring in 1 day**
   - Final warning
   - Marked as "CRITICAL"

### Email Content Template

```html
Subject: Certificate Expiration Warning: example.com

Your certificate for example.com will expire in X days.

Certificate Details:
- Common Name: example.com
- Expiration Date: 2025-06-15
- Serial Number: a1b2c3d4e5f6

Action Required:
Please renew your certificate before it expires to avoid service interruption.

[Renew Certificate Button] → Links to: https://certmanager.com/certificates/{id}/renew

Questions? Contact support@certmanager.com
```

---

## Audit & Compliance

### All Operations Are Logged

Every certificate operation is recorded in `audit_logs` table with:
- Action type
- User ID
- Certificate ID
- IP address
- User agent
- Timestamp
- Success/failure status

### Sensitive Operations

Private key access is flagged as high-sensitivity:
```typescript
action: AuditAction.PRIVATE_KEY_ACCESSED
```

### Compliance Requirements

For SOC2/ISO27001 compliance:
1. ✅ All certificate operations are logged
2. ✅ Private keys are encrypted at rest
3. ✅ Access to private keys is audited
4. ✅ Certificates cannot be deleted (only revoked)
5. ✅ Audit logs are immutable (no DELETE operations)
6. ✅ Expiration monitoring with automated alerts

---

## Best Practices

### For Users

1. **Renew Early**: Don't wait until certificates expire
2. **Monitor Notifications**: Read expiration warning emails
3. **Test Renewals**: Verify renewed certificates work before old ones expire
4. **Document Usage**: Use metadata to track where certificates are deployed
5. **Secure Private Keys**: Only download when necessary

### For Administrators

1. **Regular Audits**: Review `PRIVATE_KEY_ACCESSED` logs weekly
2. **Monitor Expiring**: Check dashboard for expiring certificates
3. **Backup Strategy**: Export certificates periodically for disaster recovery
4. **Key Rotation**: Encourage users to renew rather than extend
5. **Access Control**: Use RBAC to limit who can create/revoke certificates

---

## Future Enhancements

1. **ACME Protocol Support**: Automatic renewal via Let's Encrypt
2. **CA Integration**: Issue certificates from real Certificate Authorities
3. **CRL/OCSP**: Publish revocation lists for validation
4. **HSM Integration**: Store master encryption key in Hardware Security Module
5. **Certificate Chains**: Support intermediate certificates
6. **Automated Deployment**: Push renewed certificates to servers automatically
7. **Multi-Factor Auth**: Require 2FA for private key access
8. **Rate Limiting**: Prevent abuse of certificate generation

---

## Troubleshooting

### Certificate Shows as ACTIVE but is Expired

**Cause**: Background job hasn't run yet

**Solution**: Manually trigger expiration check or wait for next daily run

### Cannot Renew Certificate

**Cause**: Certificate is revoked

**Solution**: Create new certificate instead of renewing

### Private Key Decryption Fails

**Cause**: Master encryption key changed or corrupted

**Solution**: Restore from backup or contact administrator

### Notification Emails Not Sending

**Cause**: SMTP configuration issue

**Solution**: Check SMTP credentials in environment variables

---

## Conclusion

The Certificate Manager implements a robust lifecycle management system that:
- Automates expiration monitoring
- Provides clear state transitions
- Maintains comprehensive audit trails
- Ensures security through encryption
- Supports compliance requirements

All operations are designed with security, auditability, and user experience in mind.

