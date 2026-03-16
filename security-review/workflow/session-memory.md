# Session Memory

## Purpose
Persistent local memory for future secure-code-review sessions in this repository.

## Repository context
- Repository: `walkasins-gateway-server`
- Review workspace root: `security-review/`
- This repository is being reviewed as a backend/cloud support service for gateway/device fleet management.

## User constraints
- Do not install dependencies.
- Do not run package upgrades.
- Do not modify project configuration.
- Do not change application code unless explicitly asked.
- Use repository source code as the source of truth.
- Keep findings evidence-backed and tied to code paths, trust boundaries, or privileged operations.
- Do not generate speculative vulnerabilities.

## Canonical artifact locations
### Discovery artifacts
- `security-review/00_review_charter.md`
- `security-review/01_architecture_notes.md`
- `security-review/02_trust_boundaries.md`
- `security-review/03_security_file_inventory.md`
- `security-review/04_gateway_architecture_overview.md`
- `security-review/05_critical_security_surfaces.md`

### Focused review artifacts
- `security-review/06_initial_architecture_attack_surface_analysis.md`
- `security-review/07_authorization_access_control_review.md`
- `security-review/08_inbound_device_message_trust_boundary_review.md`
- `security-review/09_firmware_manifest_file_delivery_ota_review.md`

### Findings and summaries
- Canonical findings file:
  - `security-review/findings/90_consolidated_findings.md`
- Canonical management summary:
  - `security-review/Summaries/91_review_summary_for_management.md`

### Supporting artifacts
- Evidence:
  - `security-review/evidence/`
- Code paths:
  - `security-review/code-paths/`
- Workflow/docs:
  - `security-review/workflow/`

## Prompt/path conventions currently in use
- Focused review prompt should point to top-level `06`-`09` review artifacts.
- Consolidated findings should point to `security-review/findings/90_consolidated_findings.md`.
- Management summary should point to `security-review/Summaries/91_review_summary_for_management.md`.
- Avoid creating duplicate top-level and subfolder summary/finding artifacts unless explicitly requested.

## Current review conclusions to preserve
- Confirmed findings count: 6
- Uncertain concerns requiring manual validation count: 5
- Highest-priority confirmed finding:
  - manager-route identity is derived from request metadata rather than a reviewed server-side session binding
- Most important unresolved manual-validation area:
  - whether deployment infrastructure normalizes or constrains `useremail` before requests reach the manager app

## Important workspace notes
- Some older artifact names in prompts/workflow may drift from actual filenames.
- Prefer the existing actual files in `security-review/` over prompt examples when there is a mismatch.
- Do not delete existing files just to eliminate duplication unless explicitly asked.

## Recommended use in future sessions
- Read this file at the start of a new session before updating review artifacts.
- Treat this as local persistent memory, not as a replacement for verifying repository state.
