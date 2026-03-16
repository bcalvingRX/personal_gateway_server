Do not install dependencies, run package upgrades, modify project configuration, or change application code unless I explicitly ask.

I am conducting a controlled AI-assisted secure code review of this repository/component.

Act as a disciplined security reviewer, not a speculative vulnerability generator.

Do not install dependencies, run package upgrades, modify project configuration, or change application code unless I explicitly ask.

I am conducting a controlled pilot of AI-assisted secure code review.

The immediate target is this repository/component currently open in the workspace.

Treat this repository as the scope of analysis unless other system dependencies are explicitly visible in the code.

Act as a disciplined security reviewer, not a speculative vulnerability generator.

Goal:
Use the discovery artifacts and the repository source code to perform focused, evidence-oriented secure code review and generate review artifacts and findings.

Every confirmed finding must reference at least one security-relevant code path, privileged operation, or trust-boundary crossing identified during discovery or focused review.

Do not elevate an observation into a confirmed finding unless it is supported by a specific file/function, a specific code path or privileged operation, and a clearly missing, bypassed, or incorrectly enforced security property.

Method constraints:
- Do not produce a broad vulnerability dump.
- Only report findings or concerns supported by code in scope.
- Separate confirmed findings from uncertain concerns requiring manual validation.
- State what cannot be determined from static review alone.
- Keep code references concise and useful.
- Do not paste large code blocks.

Use as inputs if present:
- security-review/00_gateway_architecture_overview.md
- security-review/01_architecture_notes.md
- security-review/02_trust_boundaries.md
- security-review/03_security_file_inventory.md
- security-review/04_discovery_review_plan.md
- security-review/05_critical_security_assessment.md
- security-review/code-paths/
- security-review/evidence/

Create these directories if missing:
- security-review/findings/
- security-review/Summaries/
- security-review/code-paths/
- security-review/evidence/
- security-review/notes/

Primary review scopes:
Focused Review Scope Selection

Use the discovery artifacts and the determined component type to select the most relevant security review scopes for this repository.

Typical scopes include:

Backend or cloud services
- API attack surface and request handling
- authentication and authorization enforcement
- message ingestion or event processing
- external service integrations
- firmware manifest or update orchestration
- certificate, token, and secret handling

Gateway or edge services
- device-to-gateway communication handling
- gateway-to-cloud communication and authentication
- device command routing or dispatch
- OTA update mediation and delivery
- credential storage and provisioning logic

Embedded firmware or device software
- secure boot or bootloader trust chain
- firmware update verification and rollback protection
- key and certificate storage
- command or message parsing from external interfaces
- wireless or physical communication protocols
- debug, manufacturing, or service interfaces

Select the scopes most relevant to the component type identified during discovery.
Document the selected scopes and reasoning in the review artifact.

Generate or update these files in the following exact locations:

Reviews:
- security-review/06_initial_architecture_attack_surface_analysis.md
- security-review/07_authorization_access_control_review.md
- security-review/08_inbound_device_message_trust_boundary_review.md
- security-review/09_firmware_manifest_file_delivery_ota_review.md

Findings:
- security-review/findings/90_consolidated_findings.md

Summaries:
- security-review/Summaries/91_review_summary_for_management.md

If additional supporting artifacts are useful during focused review, place them here:
- security-review/code-paths/ for traced path documents
- security-review/evidence/ for supporting inventories, endpoint maps, middleware maps, and focused evidence notes
- security-review/notes/ for supplemental review notes that do not fit the formal review artifacts

For each scoped review artifact (06-09), include:
- scope reviewed
- files/functions examined
- traced code paths
- confirmed findings
- uncertain concerns requiring manual validation
- limitations
- recommended follow-up review targets

Security Property Evaluation

For each traced code path, evaluate the following security properties where applicable:

- input validation or parsing of externally supplied data
- authentication or identity establishment
- authorization or permission enforcement
- cryptographic verification (signatures, certificates, tokens, firmware integrity checks)
- trust-boundary transitions between components
- protection of privileged operations
- logging or auditability of security-sensitive actions

Document where these controls are implemented and where they appear to be missing, bypassed, or inconsistently applied.

Use this evaluation to determine whether a code path results in:
- a confirmed finding
- an uncertain concern requiring manual validation
- a reviewed area with no confirmed issue identified

For each confirmed finding within scoped reviews:
- reference affected files/functions
- include concise evidence code paths
- explain why the issue is supported by code
- describe likely impact without exaggeration

For each uncertain concern:
- identify relevant files/functions
- explain why it remains uncertain
- describe exactly what requires manual, runtime, cloud, hardware, or deployment validation

Requirements for security-review/findings/90_consolidated_findings.md:
- include only evidence-backed findings or concerns from the review artifacts
- do not invent new findings
- separate:
  - Executive summary
  - Confirmed findings
  - Uncertain concerns requiring manual validation
  - Reviewed areas with no confirmed issue identified
  - Static-analysis limitations
  - Recommended follow-up actions

For each confirmed finding in 90_consolidated_findings.md, use this structure:
- Finding ID
- Title
- Severity (only if supportable from code and review context; otherwise omit)
- Confidence
- Affected files/functions
- Evidence code paths
- Description
- Security impact
- Why this is a finding
- Recommended remediation / follow-up
- Source review artifact(s)

For each uncertain concern, use this structure:
- Concern ID
- Title
- Relevant files/functions
- Evidence code paths
- Why it remains uncertain
- What must be validated manually
- Source review artifact(s)

For reviewed areas with no confirmed issue identified, briefly state:
- review area
- files/functions examined
- conclusion

Requirements for code references:
- reference specific files and functions wherever possible
- include line numbers only if they can be determined directly from the current repository code without guessing
- do not paste large code blocks
- use concise evidence references that help engineers validate the finding quickly

Requirements for security-review/Summaries/91_review_summary_for_management.md:
- concise and factual
- suitable for a manager, auditor, or internal review record
- include review objective, scopes completed, methods used, major code paths examined, confirmed findings count, uncertain concerns count, limitations, and recommended next steps
- do not invent findings

At the end:
- summarize which files were created or updated
- identify the highest-priority confirmed finding
- identify the most important unresolved manual-validation area
