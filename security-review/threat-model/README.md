# Threat Model - Complete Package

## Overview

This directory contains a comprehensive baseline threat model for the RxFunction Gateway Server. The model identifies all STRIDE threats without assuming controls are in place, mapped to findings from the security review.

**Package Contents:**

| File | Purpose | Audience |
|------|---------|----------|
| **gateway-threat-model.json** | Threat Dragon-compatible model with all DFD elements, flows, and STRIDE threats | Security/Threat Dragon users |
| **IMPORT_GUIDE.md** | Step-by-step instructions for importing into Threat Dragon; customization tips | Tech leads, security engineers |
| **THREAT_SUMMARY.md** | Quick reference organized by component; heatmap; control status; checklists | All team members |
| **FINDINGS_TO_THREAT_MAPPING.md** | Detailed mapping between consolidated findings (CF-XX, UC-XX) and threats (T-XXX-XX) | Security reviewers, developers |
| **README.md** (this file) | Navigation guide and quick start | Everyone |

---

## Quick Start

### For Threat Dragon Users

1. Open OWASP Threat Dragon (https://threatdragon.com or local instance)
2. Create new diagram → Import JSON
3. Copy/paste entire contents of **gateway-threat-model.json**
4. Diagram will render with all elements, flows, and threats pre-populated

See **IMPORT_GUIDE.md** for detailed steps.

### For Everyone Else

1. Start with **THREAT_SUMMARY.md** for a quick overview
   - Component-based threat breakdown
   - Risk heatmap showing priority fixes
   - Control status summary
   
2. Use **FINDING_TO_THREAT_MAPPING.md** to understand how findings relate to threats
   - Jump from CF-01 → T-AUTH-01 → remediation steps
   - See deployment validation checklists for each finding
   
3. For deeper dives:
   - Original **90_consolidated_findings.md** (in parent `findings/` directory)
   - Architecture/review documents

---

## Threat Model at a Glance

### 25 Total Threats Across STRIDE Categories

| Category | Count | Priority Examples |
|----------|-------|------------------|
| **Spoofing** | 4 | T-AUTH-01 (header), T-AUTH-03 (bootstrap) |
| **Tampering** | 5 | T-TAMPER-01 (firmware), T-TAMPER-05 (GitHub) |
| **Repudiation** | 2 | T-NONREP-01 (audit), T-NONREP-02 (signatures) |
| **Information Disclosure** | 6 | T-INFO-03 (credentials), T-INFO-06 (metrics) |
| **Denial of Service** | 5 | T-DOS-02 (SQS), T-DOS-04 (DB) |
| **Elevation of Privilege** | 3 | T-AUTHZ-01 (perms), T-AUTHZ-02 (cross-fleet) |

### Critical Issues (Severity = Critical)

- **T-TAMPER-01:** Firmware binary tampering (CF-05)
- **T-AUTH-03:** First-user bootstrap privilege (CF-02)
- **T-INFO-03:** Credentials in environment files

### Mapped to Confirmed Findings

6 of 6 confirmed findings (CF-01 through CF-06) directly map to threats:

```
CF-01 → T-AUTH-01     CF-04 → T-AUTHZ-02
CF-02 → T-AUTH-03     CF-05 → T-TAMPER-01
CF-03 → T-AUTHZ-01    CF-06 → T-TAMPER-05
```

### Mapped to Uncertain Concerns

5 uncertain concerns (UC-01 through UC-05) have related threats awaiting validation:

```
UC-01 → T-AUTH-01 (ingress control)      UC-04 → T-TAMPER-01 (device verify)
UC-02 → T-AUTH-03 (production seeding)    UC-05 → T-INFO-06 (metric consumers)
UC-03 → T-AUTH-02, T-AUTHZ-02 (AWS IoT)
```

---

## Architecture Elements Modeled

### External Entities (7)
- Manager Portal Users
- W-200 Gateway Devices
- GitHub Releases API
- Green Light Guru (GLG)
- AWS IoT Core
- AWS SQS
- AWS S3

### Processes (5)
- Manager Application (port 9422)
- API Application (port 9443)
- MQTT Message Router
- SQS Message Consumer
- Firmware Manager

### Data Stores (3)
- MongoDB (systems, fleets, firmware, users, permissions)
- Redis (sessions, caching)
- AWS S3 (firmware, manifests via presigned URLs)

### Data Flows (17)
All major flows mapped from user login through firmware delivery to device telemetry.

---

## Key Findings Summary

### Most Critical (Immediate Action Required)

1. **CF-01: Manager Identity Spoofing** (T-AUTH-01)
   - User email taken from header, not session-bound
   - Fix: Bind identity to verified session

2. **CF-02: First-User Bootstrap** (T-AUTH-03)
   - Empty database allows any user to become admin
   - Fix: Disable bootstrap, require pre-seed

3. **CF-05: Firmware Integrity Missing** (T-TAMPER-01)
   - Downloaded firmware not verified before caching
   - Fix: Add digest computation and verification

### High Risk (Address in First Sprint)

4. **CF-03: Write Routes with VIEW Permission** (T-AUTHZ-01)
   - Firmware/system mutation gated only by read permission
   - Fix: Reclassify to edit/manage permissions

5. **CF-04: Cross-Fleet Firmware Access** (T-AUTHZ-02)
   - Devices can request any firmware by ID
   - Fix: Add gateway→fleet entitlement checks

6. **CF-06: GitHub Metadata Mismatch** (T-TAMPER-05)
   - Asset ID not persisted, download uses wrong parameters
   - Fix: Persist asset ID, use in download

---

## How to Use This Model

### As a Security Baseline
- Shows all identifiable threats **without controls**
- Provides foundation for risk assessment
- Helps prioritize remediation

### For Roadmap Planning
1. Review **THREAT_SUMMARY.md** → Risk Heatmap
2. Identify top-6 priority threats
3. Map to sprint capacity
4. Track remediations in issue tracker
5. Update threat status in model quarterly

### For Development
- Cross-reference threat descriptions when implementing fixes
- Use remediation steps as acceptance criteria
- Add threat-specific tests before closing findings

### For Risk/Compliance
- Use **Deployment Validation Checklists** to confirm controls
- Validate UC-XX uncertain concerns against live system
- Document trust boundaries (e.g., upstream proxy authentication)
- Track threat model version with each release

---

## File Details

### gateway-threat-model.json

**Format:** OWASP Threat Dragon v2.x compatible

**Structure:**
```json
{
  "summary": { /* metadata */ },
  "detail": {
    "assets": [ /* 7 assets */ ],
    "externalEntities": [ /* 7 entities with x,y coords */ ],
    "processes": [ /* 5 processes with x,y coords */ ],
    "dataStores": [ /* 3 stores with x,y coords */ ],
    "dataFlows": [ /* 17 flows */ ]
  },
  "threats": [ /* 25 STRIDE threats with risk/evidence/remediation */ ]
}
```

**Elements include:**
- Threat ID, category (STRIDE), title, description
- Severity and likelihood ratings
- Affected element and data flows
- Links to findings (CF-XX, UC-XX)
- Current mitigations and remediation steps

### IMPORT_GUIDE.md

**Sections:**
1. What's Included (components, threats, findings)
2. How to Import (Option A: direct JSON import; Option B: manual)
3. Reading the Threat Model (layout, severity, likelihood)
4. Key Observations (confirmed issues, uncertain issues, inferred threats)
5. Customization Tips (positioning, severity adjustment)
6. Threat Model Maintenance (review triggers, update frequency)

### THREAT_SUMMARY.md

**Sections:**
1. Threat Summary by Component (7 tables covering each system piece)
2. Threat Model Statistics (by severity, likelihood, category)
3. Risk Heatmap (severity × likelihood matrix)
4. Control Status Summary (what's in place, what's missing)
5. Deployment Validation Checklist
6. Review Triggers & Next Steps

### FINDINGS_TO_THREAT_MAPPING.md

**Sections:**
1. CF-01 through CF-06: Detailed threat mapping with evidence and validation
2. UC-01 through UC-05: Uncertain concerns with validation approach
3. Navigation Guides (for security team, developers, risk/leadership)
4. Traceability Matrix (findings → threats → code)
5. Sprint Planning approach
6. Review & Update Cadence

---

## Integration with Security Review

This threat model synthesizes the full security review:

```
Architecture, Trust Boundaries, Attack Surface (files 01-05)
                          ↓
              Consolidated Findings (90_*)
                          ↓
   Auth/Authz, Device Trust, Firmware OTA (files 06-09)
                          ↓
            This Threat Model (gateway-threat-model.json)
                          ↓
       Threat Dragon Import → Risk Dashboard → Roadmap
```

---

## Next Steps

### Phase 1: Validation (Week 1)
- [ ] Import model into Threat Dragon
- [ ] Review with team → adjust severity/likelihood per deployment reality
- [ ] Validate UC-XX uncertain concerns against live system

### Phase 2: Planning (Week 2-3)
- [ ] Prioritize top 6 threats in risk heatmap
- [ ] Map to Sprint roadmap
- [ ] Create epics or stories for each remediation
- [ ] Assign to team members

### Phase 3: Execution (Ongoing)
- [ ] Implement remediation steps
- [ ] Add specific tests for threat scenarios
- [ ] Update threat status in model
- [ ] Close findings when validation complete

### Phase 4: Maintenance (Quarterly)
- [ ] Review new code changes against threat model
- [ ] Update if architecture changes
- [ ] Re-validate UC-XX concerns
- [ ] Integrate learnings from incidents

---

## Contact & Support

For questions about:
- **Threat Dragon import:** See IMPORT_GUIDE.md
- **Finding details:** See FINDINGS_TO_THREAT_MAPPING.md or 90_consolidated_findings.md
- **Risk prioritization:** See THREAT_SUMMARY.md
- **Architecture rationale:** See security-review files (01-09_*.md)

---

## Metadata

- **Created:** March 16, 2026
- **Threat Dragon Version:** v2.x compatible
- **STRIDE Framework:** Used for categorization
- **Related Findings:** CF-01 through CF-06 (confirmed); UC-01 through UC-05 (uncertain)
- **Review Artifacts:** 09 supporting documents in security-review directory
