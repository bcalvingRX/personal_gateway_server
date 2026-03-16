# Threat Model Import Guide

## File: `gateway-threat-model.json`

This JSON file contains a comprehensive baseline threat model for the RxFunction Gateway Server. It is structured for import into **OWASP Threat Dragon** v2.x.

---

## What's Included

### 1. **Architecture Elements** (DFD Components)

**External Entities (7):**
- Manager portal users (left side)
- W-200 gateway devices (left side)
- GitHub, Green Light Guru, AWS IoT, SQS, S3 (right side - external services)

**Processes (5):**
- Manager Application (port 9422)
- API Application (port 9443)
- MQTT Message Router
- SQS Message Consumer
- Firmware Manager

**Data Stores (3):**
- MongoDB (systems, fleets, firmware, users, permissions)
- Redis (sessions, caching)
- AWS S3 (via EE-07)

**Data Flows (17):**
All major flows are mapped, from user login through firmware delivery, device telemetry, and management operations.

---

### 2. **STRIDE Threats (25 Total)**

Threats are categorized by STRIDE category:

| Category | Count | Key Threats |
|----------|-------|------------|
| **Spoofing (Authentication)** | 4 | Header injection, device spoofing, first-user bootstrap, API key compromise |
| **Tampering** | 5 | Firmware tampering, manifest substitution, DB injection, session tampering, GitHub metadata mismatch |
| **Repudiation** | 2 | Audit gaps, unsigned device messages |
| **Information Disclosure** | 6 | Presigned URL exposure, token logging, credential leakage, firmware enumeration, PII leakage, metric injection |
| **Denial of Service** | 5 | Rate limit bypass, SQS saturation, firmware flooding, DB exhaustion, S3 bandwidth exhaustion |
| **Elevation of Privilege** | 3 | View→Write permission mismatch, cross-fleet firmware access, permission hierarchy bypass |

---

### 3. **Linkage to Findings**

Each threat includes:
- **linkedFindings**: Reference to `CF-XX` confirmed findings
- **linkedConcerns**: Reference to `UC-XX` uncertain concerns
- **mitigations**: Current state of controls (if any)
- **remediationSteps**: Recommended fixes

---

## How to Import into Threat Dragon

### Option A: Direct Import (Recommended)

1. **Open Threat Dragon**: https://threatdragon.com/ (or local instance)
2. **New Diagram** → Select **JSON**
3. **Paste Content**: Copy entire contents of `gateway-threat-model.json`
4. **Import**
5. The diagram will render with all processes, data stores, flows, and threats pre-populated

### Option B: Manual Import

If direct import doesn't work:

1. Create new diagram in Threat Dragon
2. **Manually add elements** in this order:
   - External Entities (left side at x=50)
   - Processes (center at x=350-500)
   - Data Stores (bottom at y=550)
3. **Add data flows** connecting them (all 17 listed)
4. **For each element**, right-click and **Add Threats**, then copy/paste threat descriptions

---

## Reading the Threat Model

### Layout Strategy

Elements are positioned by `x, y` coordinates for readability:

```
LEFT SIDE (x=50)              | CENTER (x=350-500)         | RIGHT SIDE (x=700)
─────────────────────────────────────────────────────────────────────────
Manager Users (y=100)          Manager App (y=150)          GitHub API (y=100)
                               
                               API App (y=250)              GLG (y=200)
                               
                               MQTT Router (y=400)          AWS IoT (y=350)
W-200 Devices (y=400)          SQS Consumer (y=400)
                               Firmware Mgr (y=100)         AWS SQS (y=450)
                                                            
                               MongoDB (y=550)              AWS S3 (y=550)
                               Redis (y=550)
```

### Threat Severity

- **Critical** (Red): Firmware tampering, credential exposure, first-user bootstrap – requires immediate fix
- **High** (Orange): Permission mismatches, off-fleet access, spoofing – address before prod
- **Medium** (Yellow): Rate limiting, audit gaps, enumeration – plan remediation

### Threat Likelihood

- **High**: Likely under normal attack scenarios
- **Medium**: Possible but requires specific conditions
- **Low**: Unlikely or requires sophisticated attacker

---

## Key Observations from This Model

### Confirmed Issues (from static review)

These threats directly map to `CF-XX` findings and are confirmed to exist in code:
- **T-AUTH-01**: CF-01 (header-driven identity)
- **T-AUTH-03**: CF-02 (first-user admin bootstrap)
- **T-AUTHZ-01**: CF-03 (view→write permission mismatch)
- **T-AUTHZ-02**: CF-04 (cross-fleet firmware access)
- **T-TAMPER-01**: CF-05 (firmware integrity missing)
- **T-TAMPER-05**: CF-06 (GitHub metadata mismatch)

### Uncertain Issues (deployment/operational)

These map to `UC-XX` concerns and require validation against live infrastructure:
- **T-AUTH-02**: UC-03 (AWS IoT policy enforcement)
- **T-AUTHZ-02**: UC-03 (effective publisher set)
- **T-TAMPER-01**: UC-04 (device-side verification)
- **T-INFO-06**: UC-05 (metric field downstream impact)

### Additional Threats

Threats without direct findings are inferred from architecture review and represent threats that may not have been explicitly flagged but exist in the baseline model:
- API key compromise, permission hierarchy bypass, rate limiting bypass, audit gaps, credential exposure, etc.

---

## Using This Model Going Forward

### Phase 1: Confirm Controls
For each threat, validate:
- Is there a deployed control (proxy, K8S policy, DB encryption)?
- What is the actual risk ranking?
- Update **mitigations** field with confirmed state

### Phase 2: Prioritize Remediation
Sort by Severity × Likelihood and assign to sprints

### Phase 3: Track Fixes
As remediations are implemented:
- Update threat status to "Mitigated"
- Link to PRs / tickets in comments
- Re-import updated model

### Phase 4: Add Device-Side Threats
Once device code is available, extend model with:
- OTA update verification
- Manifest parsing
- Fallback/recovery scenarios

---

## Customization Tips

### Change Element Positions
Edit `x` and `y` coordinates for better readability. Example:
```json
"x": 350,
"y": 150
```

### Adjust Threat Severity
Based on your deployment context, change severity:
```json
"severity": "High",  // Change to "Critical", "Medium", "Low"
```

### Add Your Controls
For each mitigation step implemented, update the **mitigations** field:
```json
"mitigations": "Presigned URLs (examined). Session binding: IN PROGRESS (PR #123)"
```

---

## Threat Model Maintenance

**Review Triggers:**
- Code changes to auth, firmware handling, or device message processing
- Infrastructure changes (proxy, K8S policies)
- New dependencies or integrations
- Security incidents or near-misses

**Update Frequency:**
- Before each major release
- After architecture decisions
- Quarterly threat landscape review

---

## Export & Sharing

Once imported into Threat Dragon:
1. **Export as PDF** for stakeholders
2. **Share JSON** for team collaboration
3. **Track changes** in version control

---

## Next Steps

1. **Import this model** into your Threat Dragon instance
2. **Validate** threat severity and likelihood against your deployment
3. **Map remediations** to your roadmap and sprints
4. **Link findings** from the consolidated findings document
5. **Schedule quarterly reviews** as the system evolves
