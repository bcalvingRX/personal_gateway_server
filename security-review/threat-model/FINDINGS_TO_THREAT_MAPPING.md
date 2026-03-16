# Findings → Threat Model Mapping

This document maps the consolidated findings (CF-XX, UC-XX) to specific threats in the baseline threat model, making it easy to navigate between:
- **Consolidated Findings** (`90_consolidated_findings.md`)
- **Threat Model** (`gateway-threat-model.json`)
- **Threat Dragon Diagram** (after import)

---

## Confirmed Findings (CF-XX) → Threats

### CF-01: Manager-route identity derived from request metadata

**Description:** Identity taken from `useremail` header; only `sessID` cookie presence required.

**Related Threats:**
- **T-AUTH-01: User Identity Spoofing via Header** 
  - Element: `P-01` (Manager Application)
  - Category: Spoofing
  - Severity: High | Likelihood: High
  - Risk: Attacker can attempt authorization as any stored user by supplying email + valid cookie
  - Evidence: `authtoken.middleware.js:verify()` at lines 28-53

**Recommended Remediation:**
1. Bind `useremail` to `req.session.user` after authentication
2. Reject client-supplied `useremail` headers
3. Validate identity against server-side session before authorization checks

**Deployment Validation:**
- [ ] Upstream proxy injects `useremail` from trusted identity source
- [ ] Application rejects direct `useremail` headers from clients
- [ ] Session token proves identity, not header

---

### CF-02: First-user bootstrap assigns administrative access

**Description:** When user count is zero, new user automatically assigned `Admin Group`.

**Related Threats:**
- **T-AUTH-03: First-User Bootstrap Creates Admin Without Approval**
  - Element: `P-01` (Manager Application)
  - Category: Spoofing
  - Severity: Critical | Likelihood: Medium
  - Risk: Empty database allows any presenter to gain admin privileges
  - Evidence: `authtoken.middleware.js:verify()` at lines 41-46; `user.service.js:createUser()` at lines 69-90

**Recommended Remediation:**
1. Remove implicit bootstrap from authorization runtime
2. Require explicit provisioning or seed script
3. Add operational guard to prevent re-entry after migrations

**Deployment Validation:**
- [ ] Production always pre-creates users/groups before exposure
- [ ] Reset/migration procedures are documented and tested
- [ ] Bootstrap code is disabled or unreachable in production

---

### CF-03: Write-capable routes gated only by SYSTEM:view

**Description:** Firmware/system mutation routes require `SYSTEM:view` instead of `edit`/`manage` permission.

**Related Threats:**
- **T-AUTHZ-01: Write Routes Protected Only by VIEW Permission**
  - Element: `P-01` (Manager Application)
  - Category: Elevation of Privilege
  - Severity: High | Likelihood: High
  - Risk: Read-only roles gain unintended write access to systems, fleets, firmware
  - Affected Routes:
    - `/setFleet` → `systemController.setFleet()`
    - `/modify` → `systemController.modifySystem()`
    - `/firmware` → `fwupdatemanagement.controller.js:saveFirmware()`
    - `/group`, `/fleet`, `/modify` → firmware management
  - Evidence: `routes/system.route.js` lines 31-43; `routes/firmwareupdate.route.js` lines 15-51

**Recommended Remediation:**
1. Reclassify routes to use `SYSTEM:edit`, `SYSTEM:manage`, or similar
2. Review deployed UserGroups and Permissions documents for actual exposure
3. Add regression tests asserting each mutation route requires non-view permission

**Deployment Validation:**
- [ ] Routes are updated to non-view permissions
- [ ] Deployed roles/groups are reviewed and corrected
- [ ] Automated tests prevent regression

---

### CF-04: Inbound device data requests served without entitlement checks

**Description:** Device firmware/manifest requests served by identifier without verifying device→fleet membership.

**Related Threats:**
- **T-AUTHZ-02: Cross-Fleet Firmware Access via Identifier Enumeration**
  - Element: `P-03` (MQTT Message Router)
  - Category: Elevation of Privilege
  - Severity: High | Likelihood: High
  - Risk: Any device can request firmware/manifest from any fleet
  - Affected Flows:
    - Device publishes `data` request → MQTT Router → firmware lookup by ID → S3 URL response
  - Evidence: 
    - `routes/mqtt.route.js` lines 12-26
    - `system.controller.js:processSystemGetFile()` lines 284-295
    - `system.service.js:getFirmware()`, `getFirmwareManifest()`

**Related Additional Threat:**
- **T-TAMPER-02: Manifest Tampering or Substitution**
  - Manifests returned without integrity verification, keyed only by `state_hash`
  - Category: Tampering
  - Severity: High | Likelihood: Medium

**Recommended Remediation:**
1. Resolve `thingID` to system/fleet before serving firmware
2. Restrict manifest access to the active manifest for that system
3. Add tests for off-fleet firmware and manifest request denial

**Deployment Validation:**
- [ ] Device→fleet mapping is validated in application
- [ ] Off-fleet requests are denied with logging
- [ ] Manifest signing or HMAC verification is implemented

---

### CF-05: Backend OTA delivery lacks firmware binary integrity verification

**Description:** Firmware downloaded and cached without cryptographic digest verification.

**Related Threats:**
- **T-TAMPER-01: Firmware Binary Tampering in Transit or at Source**
  - Element: `P-05` (Firmware Manager)
  - Category: Tampering
  - Severity: Critical | Likelihood: Medium
  - Risk: Modified firmware could be distributed to devices undetected
  - Affected Flows:
    - GitHub/GLG fetch → download → S3 upload → device retrieval
  - Evidence:
    - `github.service.js:checkFirmwareExists()` lines 5-20 (only checks existence)
    - `fwupdatemanagement.controller.js:saveFirmware()` lines 74-133 (no digest)
    - `system.service.js:createStateRecord()` lines 290-321 (no integrity check)

**Recommended Remediation:**
1. Persist expected SHA256/SHA512 digest with firmware record
2. Verify download against digest before S3 upload
3. Refresh S3 presigned URLs with verification if caching is refreshed
4. Align with device-side signature/digest validation

**Deployment Validation:**
- [ ] Firmware digests are computed and stored
- [ ] Backend verifies before S3 caching
- [ ] Device verifies before installation
- [ ] End-to-end OTA test is passing

---

### CF-06: GitHub OTA metadata mismatch

**Description:** GitHub asset ID is returned but not persisted; download function expects ID but receives metadata fields.

**Related Threats:**
- **T-TAMPER-05: GitHub OTA Metadata Mismatch**
  - Element: `P-05` (Firmware Manager)
  - Category: Tampering
  - Severity: Medium | Likelihood: High
  - Risk: GitHub firmware distribution fails or retrieves wrong asset
  - Affected Flow: GitHub firmware registration → download
  - Evidence:
    - `github.service.js:checkFirmwareExists()` returns `asset.id` lines 15-20
    - `system.service.js:saveFirmware()` stores `org`, `repo`, `tag`, `file` but not asset ID (lines 67-78)
    - `system.controller.js:processSystemGetFirmware()` calls download with metadata, not ID (lines 277-280)
    - `github.service.js:downloadFirmwareRevision(id)` expects single ID parameter (lines 36-43)

**Recommended Remediation:**
1. Persist GitHub asset ID in firmware record
2. Use asset ID exclusively in download function
3. Add integration test for GitHub-backed firmware end-to-end
4. Assess impact on already-stored GitHub firmware records

**Deployment Validation:**
- [ ] GitHub firmware records are updated with asset IDs
- [ ] Download function uses asset ID
- [ ] Existing GitHub-backed firmware tested

---

## Uncertain Concerns (UC-XX) → Threats

### UC-01: Upstream infrastructure may normalize or overwrite useremail

**Relationship to Threats:**
- **T-AUTH-01: User Identity Spoofing via Header** (affects impact assessment)

**Why It Remains Uncertain:**
- Repository does not include proxy, ingress, or identity-gateway configuration

**What Must Be Validated:**
- Does deployed ingress/proxy inject `useremail` from trusted identity source?
- Is direct client control of `useremail` blocked in production?
- Is the upstream control dependency documented?

**Validation Method:**
- [ ] Review ingress/API Gateway configuration
- [ ] Test with spoofed `useremail` header from external client
- [ ] Document trust boundary in architecture or security runbook

---

### UC-02: Production seeding prevents first-user bootstrap exposure

**Relationship to Threats:**
- **T-AUTH-03: First-User Bootstrap Creates Admin** (affects likelihood)

**Why It Remains Uncertain:**
- Review did not include deployment seed scripts or production DB state

**What Must Be Validated:**
- Do production deployments always pre-create users/groups before exposure?
- Can operational reset/migration procedures recreate empty-user condition?
- Is bootstrap behavior intentionally relied upon?

**Validation Method:**
- [ ] Audit deployment seeding process
- [ ] Document bootstrap procedure and guards
- [ ] Test deployment without seed (should fail or be blocked)

---

### UC-03: Effective publisher set for device messages depends on AWS IoT policy

**Relationship to Threats:**
- **T-AUTH-02: Device Identity Spoofing in MQTT Messages** (affects likelihood)
- **T-AUTHZ-02: Cross-Fleet Firmware Access** (affects impact)

**Why It Remains Uncertain:**
- Repository does not include AWS IoT certificates, topic policies, or subscription policy

**What Must Be Validated:**
- Which principals can publish to `gateway/send/cbor` topic?
- Are per-device topic restrictions enforced?
- Could compromised/test credentials reach production ingestion?

**Validation Method:**
- [ ] Review AWS IoT Core policies
- [ ] Audit certificate provisioning and lifecycle
- [ ] Test off-device message injection (should be denied)

---

### UC-04: Device-side firmware verification exists outside backend

**Relationship to Threats:**
- **T-TAMPER-01: Firmware Binary Tampering** (affects likelihood)

**Why It Remains Uncertain:**
- Device-side OTA client code is not in this repository

**What Must Be Validated:**
- Does gateway/device validate firmware signatures or digests before install?
- Are manifest integrity checks implemented?
- Are backend and device controls coordinated?

**Validation Method:**
- [ ] Review device OTA client code
- [ ] Test with modified firmware (should be rejected)
- [ ] Document end-to-end integrity controls
- [ ] Align device and backend on trust model

---

### UC-05: Downstream impact of arbitrary metric fields

**Relationship to Threats:**
- **T-INFO-06: Arbitrary Metric Fields Stored Without Validation** (affects severity)

**Why It Remains Uncertain:**
- Repository does not show all downstream consumers (dashboards, automation, reports)

**What Must Be Validated:**
- Which systems read from `SystemMetrics`?
- Do any downstream systems assume trusted field names?
- Can metric injection cause downstream failures or leaks?

**Validation Method:**
- [ ] Audit all downstream metric consumers
- [ ] Define expected metric schema
- [ ] Test metric injection (excess fields should be rejected or harmless)

---

## Navigation Guide: Finding → Threat → Action

### For Security Team

**Starting Point: Consolidated Findings**
```
90_consolidated_findings.md
↓
Find CF-XX or UC-XX
↓
Look up in this mapping
↓
See linked threat(s) (T-XXX-XX)
↓
Open gateway-threat-model.json or Threat Dragon
↓
Review threat details: severity, likelihood, remediations
↓
Create task/epic in issue tracker
```

### For Developers

**Starting Point: Threat Model**
```
Threat Dragon (after import)
↓
Click threat → Review description + remediations
↓
See linkedFindings field
↓
Open 90_consolidated_findings.md
↓
Review code evidence paths
↓
Make code changes
↓
Update threat status in model
```

### For Risk/Leadership

**Starting Point: Risk Assessment**
```
THREAT_SUMMARY.md (Quick Reference)
↓
Review Heatmap by Severity × Likelihood
↓
Review "Priority Fix Order" (top 6)
↓
Review "Control Status Summary"
↓
Use "Deployment Validation Checklist"
↓
Align with product roadmap
```

---

## Traceability Matrix

| Finding | Threat | Element | Category | Severity | Code Evidence | Remediation |
|---------|--------|---------|----------|----------|-------|------|
| CF-01 | T-AUTH-01 | P-01 | Spoofing | High | authtoken.middleware.js:28-53 | Bind session |
| CF-02 | T-AUTH-03 | P-01 | Spoofing | Critical | user.service.js:69-90 | Remove bootstrap |
| CF-03 | T-AUTHZ-01 | P-01 | PrivEsc | High | routes/system.route.js:31-51 | Change perms |
| CF-04 | T-AUTHZ-02 | P-03 | PrivEsc | High | system.service.js:getFirmware() | Add entitlement |
| CF-05 | T-TAMPER-01 | P-05 | Tampering | Critical | github.service.js:5-20 | Add digest verify |
| CF-06 | T-TAMPER-05 | P-05 | Tampering | Medium | system.service.js:67-78 | Fix metadata |
| UC-01 | T-AUTH-01 | - | Spoofing | High | - | Validate upstream |
| UC-02 | T-AUTH-03 | - | Spoofing | Critical | - | Validate seeding |
| UC-03 | T-AUTH-02 | P-03 | Spoofing | High | - | Validate AWS IoT |
| UC-04 | T-TAMPER-01 | - | Tampering | Critical | - | Validate device |
| UC-05 | T-INFO-06 | P-03 | InfoDisc | Medium | - | Validate consumers |

---

## Using This in Sprints

### Sprint Planning

1. **Query by Finding or Threat**
   - "What do we need to fix for CF-01?" → T-AUTH-01 → session binding task
   - "What impacts device security?" → T-AUTH-02, T-AUTHZ-02, T-TAMPER-01 → 3-task epic

2. **Estimate by Remediation**
   - Each recommended remediation step is a subtask
   - CF-03 remediation has ~3 steps (update routes, review roles, add tests) → ~8-13 points
   - CF-05 remediation has ~3 steps (add digest, verify, align device) → ~13-21 points

3. **Validate by Testing**
   - Each threat has mitigations → create test cases that verify they work
   - T-AUTH-01 → test that spoofed email is rejected
   - T-AUTHZ-02 → test that off-fleet firmware is denied

### Definition of Done

Before marking a finding as resolved:
- [ ] Code changes implemented (per remediation steps)
- [ ] Tests added covering threat scenario
- [ ] Threat status updated in threat model ("Mitigated")
- [ ] Deployment validation checklist items completed
- [ ] Documentation updated (architecture, security runbook)

---

## Review & Update Cadence

- **After sprint:** Update threat model if code changes auth/firmware/device logic
- **After deployment:** Validate UC-XX uncertain concerns against live system
- **Quarterly:** Review new threats inferred from architecture changes
- **Incident:** Add new threat if attack pattern not previously modeled
- **Dependency update:** Review if security boundaries changed
