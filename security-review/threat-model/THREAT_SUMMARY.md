# Baseline Threat Model - Quick Reference

## Threat Summary by System Component

### 1. MANAGER APPLICATION (Port 9422)

**External Interactions:**
- Users → HTTPS → Manager App → MongoDB / Redis

**Threats:**
| ID | Title | Severity | Confidence | Finding |
|---|---|---|---|---|
| T-AUTH-01 | User Identity Spoofing via Header | High | High | CF-01 |
| T-AUTH-03 | First-User Bootstrap Privilege | Critical | High | CF-02 |
| T-AUTHZ-01 | Write Routes Gated by VIEW | High | High | CF-03 |
| T-AUTHZ-03 | Permission Hierarchy Bypass | Medium | Low | - |
| T-TAMPER-03 | MongoDB Injection | High | Medium | - |
| T-TAMPER-04 | Session Token Tampering | High | Low | - |
| T-INFO-02 | Tokens in Logs | High | Medium | - |
| T-INFO-03 | Credentials in Environment | Critical | Medium | - |
| T-DOS-01 | Rate Limit Bypass | Medium | Medium | - |
| T-NONREP-01 | Admin Actions Not Audited | Medium | Low | - |

**Critical Remediation Path:**
1. **Immediate:** Replace header-driven identity with session binding (CF-01)
2. **Immediate:** Disable first-user bootstrap code, require pre-seed (CF-02)
3. **Sprint 1:** Reclassify write routes to edit/manage permissions (CF-03)
4. **Sprint 1:** Add audit logging for sensitive operations

---

### 2. API APPLICATION (Port 9443)

**External Interactions:**
- API Clients → HTTPS → API App → MongoDB → Systems provisioning

**Threats:**
| ID | Title | Severity | Confidence | Finding |
|---|---|---|---|---|
| T-AUTH-04 | API Key Compromise | High | Medium | - |
| T-DOS-01 | Rate Limit Bypass | Medium | Medium | - |
| T-INFO-02 | Tokens in Logs | High | Medium | - |
| T-INFO-03 | Credentials in Environment | Critical | Medium | - |

**Note:** API app is less critical than manager app (separate auth model, API keys), but same secrets/logging issues apply.

---

### 3. MQTT MESSAGE ROUTER & SQS CONSUMER

**External Interactions:**
- Gateway Devices → AWS IoT → SQS → Router → MongoDB / Athena

**Threats:**
| ID | Title | Severity | Confidence | Finding |
|---|---|---|---|---|
| T-AUTH-02 | Device Identity Spoofing | High | Medium | UC-03 |
| T-AUTHZ-02 | Cross-Fleet Firmware Access | High | High | CF-04 |
| T-INFO-06 | Arbitrary Metric Fields | Medium | Medium | UC-05 |
| T-DOS-02 | SQS Queue Saturation | High | Medium | - |
| T-DOS-03 | Firmware Download Flooding | Medium | Medium | - |
| T-NONREP-02 | Device Message Not Signed | Medium | Low | - |

**Critical Remediation Path:**
1. **Immediate:** Add gateway→fleet entitlement checks before serving firmware/manifest (CF-04)
2. **Sprint 1:** Validate device identity against AWS IoT policy
3. **Sprint 1:** Define and validate metric schema whitelist
4. **Sprint 2:** Add rate limiting per thingID

---

### 4. FIRMWARE MANAGER SERVICE

**External Integrations:**
- GitHub & GLG APIs → Firmware Manager → S3 Cache → MongoDB metadata

**Threats:**
| ID | Title | Severity | Confidence | Finding |
|---|---|---|---|---|
| T-TAMPER-01 | Firmware Tampering In Transit | Critical | High | CF-05 |
| T-TAMPER-05 | GitHub Metadata Mismatch | Medium | High | CF-06 |
| T-DOS-03 | Firmware Download Flooding | Medium | Medium | - |

**Critical Remediation Path:**
1. **Immediate:** Add SHA256 digest verification before S3 upload (CF-05)
2. **Immediate:** Fix GitHub asset ID persistence and download (CF-06)
3. **Sprint 1:** Rate limit GitHub/GLG API calls
4. **Sprint 1:** Cache firmware lookups to prevent repeated upstream calls

---

### 5. DATA STORES (MongoDB, Redis, S3)

**Threats:**
| ID | Title | Severity | Confidence | Finding |
|---|---|---|---|---|
| T-TAMPER-03 | MongoDB Injection | High | Medium | - |
| T-TAMPER-04 | Redis Session Tampering | High | Low | - |
| T-INFO-03 | Credentials in Environment | Critical | Medium | - |
| T-INFO-04 | Firmware ID Enumeration | Medium | High | - |
| T-INFO-05 | User PII Leakage | Medium | Low | - |
| T-DOS-04 | Database Connection Exhaustion | Medium | Medium | - |
| T-DOS-05 | S3 Bandwidth Exhaustion | Medium | Medium | - |

**Critical Remediation Path:**
1. **Immediate:** Move secrets from .env to external secrets manager
2. **Sprint 1:** Use cryptographic UUIDs for firmware IDs
3. **Sprint 1:** Add per-user/key rate limits to database
4. **Sprint 2:** Encrypt PII fields at rest

---

## Threat Model Statistics

### By Severity
- **Critical:** 3 threats (15-20% of risk)
  - T-TAMPER-01 (firmware integrity)
  - T-AUTH-03 (first-user bootstrap)
  - T-INFO-03 (credential exposure)

- **High:** 11 threats (65-70% of risk)
  - Identity, authorization, and tampering threats
  
- **Medium:** 11 threats (10-15% of risk)
  - DoS, enumeration, audit gaps

### By Likelihood
- **High Likelihood:** 11 threats
  - Most likely under normal attack scenarios
  
- **Medium Likelihood:** 11 threats
  - Possible with specific attack conditions
  
- **Low Likelihood:** 3 threats
  - Upper/lower tail risks or sophisticated attacks

### By Category
- **STRIDE-Spoofing:** 4 threats
- **STRIDE-Tampering:** 5 threats
- **STRIDE-Repudiation:** 2 threats
- **STRIDE-Info Disclosure:** 6 threats
- **STRIDE-Denial of Service:** 5 threats
- **STRIDE-Elevation of Privilege:** 3 threats

---

## Risk Heatmap: Severity × Likelihood

```
High Likelihood
  ↑
  │ Critical    T-AUTH-01        T-AUTHZ-02
  │             (Spoofing)       (Priv Esc)
  │
  │ High        T-TAMPER-01      T-TAMPER-01
  │             (Firmware TMP)   (Multiple HIGH)
  │
  │ Medium      T-INFO-04        T-DOS-02
  │             (Enumeration)    (SQS Sat)
  │
  └─────────────────────────────────────────→ 
    Critical    High      Medium      Low Likelihood
```

**Priority Fix Order:**
1. CF-01 (T-AUTH-01) - High/High
2. CF-02 (T-AUTH-03) - Critical/Medium
3. CF-04 (T-AUTHZ-02) - High/High
4. CF-05 (T-TAMPER-01) - Critical/Medium
5. CF-03 (T-AUTHZ-01) - High/High
6. CF-06 (T-TAMPER-05) - Medium/High

---

## Control Status Summary

### Controls in Place
- ✅ Express.js middleware framework (security foundation)
- ✅ MongoDB schema validation (input boundaries)
- ✅ Mongoose for parameterized queries
- ✅ Rate limiting middleware (express-rate-limit)
- ✅ HTTPS/TLS for transit (manager app, external APIs)
- ✅ AWS IoT certificates (device auth, external control)
- ✅ Presigned URLs with short lifetime (S3 access)
- ✅ Redis session store (stateful auth potential)

### Controls Missing or Broken
- ❌ Session identity binding (CF-01)
- ❌ First-user bootstrap protection (CF-02)
- ❌ Permission classification (CF-03)
- ❌ Device→fleet entitlement (CF-04)
- ❌ Firmware integrity verification (CF-05)
- ❌ GitHub asset ID persistence (CF-06)
- ❌ Audit logging for admin actions
- ❌ Credential lifecycle management
- ❌ Per-device rate limiting
- ❌ Metric schema validation
- ❌ Device message signing

---

## Deployment Validation Checklist

Before considering threats "mitigated," validate:

### Authentication & Authorization
- [ ] Does upstream proxy/ingress enforce `useremail` from trusted identity?
- [ ] Are user/group records pre-seeded before service exposure?
- [ ] Are write-capable routes protected by non-view permissions?
- [ ] Is session identity bound to user email after login?

### Device & Firmware Security
- [ ] Does AWS IoT policy restrict device publishing to own topic?
- [ ] Are device requests validated against fleet membership?
- [ ] Is firmware verified against cryptographic digest before delivery?
- [ ] Does device perform signature/hash validation before install?

### Operations & Infrastructure
- [ ] Are secrets managed via external secrets manager?
- [ ] Are databases, Redis, S3 access controlled by VPC/IAM?
- [ ] Is audit logging centralized and immutable?
- [ ] Are deployments pre-seeding users/permissions?

### API & Rate Limiting
- [ ] Are per-key rate limits enforced?
- [ ] Are per-device rate limits enforced on MQTT path?
- [ ] Are GitHub/GLG API calls cached and rate-limited?
- [ ] Are database connection limits set?

---

## Next Review Triggers

This threat model should be revisited:

1. **Code Changes** to:
   - Authentication or authorization logic
   - Firmware handling or OTA coordination
   - Device message processing
   - Database schema

2. **Infrastructure Changes** to:
   - Proxy/ingress configuration
   - AWS IoT policies
   - KMS or secrets management
   - VPC or network segmentation

3. **Operational Changes** to:
   - Database reset/migration procedures
   - Deployment seeding process
   - Credential rotation policies

4. **Incidents or Near-Misses** including:
   - Unauthorized access attempts
   - Firmware distribution failures
   - Unexpected device behavior

---

## Integration with Review Artifacts

This threat model synthesizes findings from:
- ✅ `90_consolidated_findings.md` (confirmed/uncertain findings)
- ✅ `06_initial_architecture_attack_surface_analysis.md` (attack surface)
- ✅ `07_authorization_access_control_review.md` (auth/authz)
- ✅ `08_inbound_device_message_trust_boundary_review.md` (device flows)
- ✅ `09_firmware_manifest_file_delivery_ota_review.md` (OTA security)

Threats without explicit findings represent inferred risks from the architecture.
