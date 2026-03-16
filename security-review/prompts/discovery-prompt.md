Do not install dependencies, run package upgrades, modify project configuration, or change application code unless I explicitly ask.

I am conducting a controlled pilot of AI-assisted secure code review.

The immediate target is this repository/component currently open in the workspace.

Treat this repository as the scope of analysis unless other system dependencies are explicitly visible in the code.

Act as a disciplined security reviewer, not a speculative vulnerability generator.

Goal:
Perform the discovery phase of a secure code review and build the foundational review workspace for this component before deep vulnerability analysis.

Method constraints:
- Do not produce a broad vulnerability dump.
- Focus first on architecture understanding, trust boundaries, attack surface, security-relevant files, and high-value code paths.
- Only make claims supported by the repository code and files in scope.
- Clearly distinguish confirmed observations from assumptions or items requiring manual validation.
- State what cannot be determined from static review alone.
- Keep the output evidence-oriented and suitable for later internal review documentation.

Tasks:
1. Determine the role of this component/repository in the larger system, based only on the code and files in scope.
2. Component Type Determination

    Before continuing discovery, determine the type of component represented by this repository based on code structure, dependencies, and system context if available.

    Possible component types include:
    - backend service
    - gateway / docking-station firmware
    - wearable embedded firmware
    - shared protocol or communications module
    - cloud support service
    - tooling or infrastructure component

    If system context documents exist under security-review/system-context/ or are otherwise available in the repository, use them to understand the intended role of this component within the broader system.

    However, do not assume system behavior that is not supported by code or documentation in scope.

    Record the determined component type and reasoning in:
    security-review/01_architecture_notes.md

3. Component-Specific Security Focus
    Based on the determined component type, adjust the discovery focus accordingly.
    Examples:

    Backend service
    - HTTP routes and API endpoints
    - authentication and authorization middleware
    - external service integrations
    - message ingestion paths
    - firmware manifest or delivery orchestration

    Gateway / docking station
    - device-to-gateway communication
    - gateway-to-cloud communication
    - OTA update mediation
    - command routing to devices
    - credential storage and provisioning logic

    Wearable embedded firmware
    - secure boot chain
    - firmware update verification
    - key and certificate storage
    - command/message parsing
    - wireless protocol handling
    - debug or manufacturing interfaces

4. Identify major entry points, interfaces, and external interactions, including:
   - HTTP routes / APIs
   - message queues / brokers
   - device communications
   - background jobs / schedulers
   - firmware / OTA flows
   - cloud integrations
   - external APIs
   - file or object storage access
   - certificate / key / secret handling
5. Map the major architectural layers and key modules.
6. Identify the main trust boundaries and explain what crosses them.
7. Build a prioritized inventory of security-relevant files and directories.
8. Privileged Operations Identification
    Before selecting candidate code paths, identify operations within the repository that perform privileged or security-sensitive actions.

    Examples of privileged operations include:

    - executing system or shell commands
    - modifying system configuration
    - performing firmware updates or firmware delivery
    - generating download URLs or signed URLs
    - modifying user, role, or permission state
    - publishing commands or messages to devices
    - interacting with cloud infrastructure or device control channels
    - accessing or modifying cryptographic keys or certificates
    - performing authentication or identity validation
    - provisioning devices or loading security context
    - reading or writing security-sensitive storage

    For each identified privileged operation:

    - record the file and function where the operation occurs
    - identify what external input or internal component triggers it
    - identify the trust boundary crossed before the operation executes
    - determine whether authorization or validation occurs before the operation

    Document these operations in:

    security-review/evidence/privileged_operations_inventory.md

    This inventory should help guide the selection of high-priority code paths to trace.
    
9. Identify candidate high-risk code paths worth deeper review.

Use the privileged operations inventory and trust boundary analysis to identify security-relevant paths through the system.

10. Decide which focused review scope should be performed next, based on what is discovered.

Create or update the following structure under security-review/:

- 00_gateway_architecture_overview.md
- 01_architecture_notes.md
- 02_trust_boundaries.md
- 03_security_file_inventory.md
- 04_discovery_review_plan.md
- 05_critical_security_assessment.md

Also create these subdirectories if missing:
- security-review/code-paths/
- security-review/evidence/
- security-review/findings/
- security-review/notes/
- security-review/summaries/

Code Path Identification and Prioritization

During discovery, identify all security-relevant code paths observable in the repository.

Security-relevant paths typically include flows that involve:
- authentication or identity establishment
- authorization or permission checks
- inbound device or external messages
- firmware update or file delivery
- command execution or privileged operations
- persistence of externally supplied data
- external service integration (AWS, queues, cloud APIs)
- certificate, token, or key handling

For each candidate code path:
- identify the entry point
- trace the major files/functions involved
- identify trust-boundary crossings
- identify any privileged actions performed
- explain why the path is security relevant

Create code-path artifacts under:

security-review/code-paths/

Naming examples:
- manager_auth_permission_path.md
- inbound_device_message_path.md
- firmware_delivery_path.md
- device_shadow_update_path.md
- token_validation_path.md
- queue_to_database_persistence_path.md

Each code-path artifact should include:
- purpose of the path
- entry point
- files/functions traversed
- trust-boundary crossings
- security-relevant decisions
- downstream privileged actions
- unknowns requiring runtime or deployment validation

Prioritization:

Rank all identified code paths by security relevance and include the prioritized list in:

security-review/04_discovery_review_plan.md

Mark each path with:
- priority (critical / high / medium)
- reasoning for priority
- recommended focused review artifact to produce next

Requirements for each file:

00_gateway_architecture_overview.md
- plain-language overview of the component’s role in the broader system
- major services, modules, and interfaces
- major inbound and outbound data flows
- security-relevant responsibilities
- unknowns or out-of-scope areas

01_architecture_notes.md
- architectural observations grounded in code
- entry points and major layers
- key dependencies and integrations
- notable runtime or deployment assumptions visible from code/config

02_trust_boundaries.md
- list each trust boundary identified
- what data or control crosses it
- why it matters
- what trust assumption appears to be made
- what should be validated later through manual or runtime review

03_security_file_inventory.md
- prioritized list of security-relevant files/directories
- for each item include:
  - path
  - why it matters
  - security category (auth, authz, crypto, secrets, update flow, communications, middleware, persistence, external integration, etc.)
  - priority for follow-up review

04_discovery_review_plan.md
- recommend the next 3 to 6 focused review targets
- rank them in priority order
- explain why each target matters
- identify what artifact should be produced next for each one

05_critical_security_assessment.md
- summarize the most important security-relevant observations from discovery
- do not overstate findings
- separate:
  - confirmed code-backed concerns
  - likely high-risk areas needing focused review
  - unknowns requiring runtime, cloud, hardware, or deployment validation

Additional discovery outputs:
1. Create concise evidence artifacts under security-review/evidence/ where useful, such as:
   - api_endpoint_map.md
   - middleware_inventory.md
   - external_integration_inventory.md
   - auth_and_session_inventory.md
   - update_flow_inventory.md
   - message_ingestion_inventory.md

2. Create initial security-relevant code-path trace artifacts for the most important paths identified during discovery.

Focus on paths that involve one or more of the following:
- authentication or identity establishment
- authorization or permission checks
- trust-boundary crossings
- externally supplied input reaching privileged operations
- firmware update, file delivery, or OTA handling
- certificate, key, token, or secret handling
- device-to-gateway or gateway-to-cloud communications
- cloud control, provisioning, or administrative actions
- configuration changes, command execution, or other privileged system behavior

Typically this will include 2–5 representative security-relevant code paths during discovery.

Additional paths may be traced later during focused review stages as deeper analysis is performed.

Each code-path file should include:
- purpose of the path
- entry point
- files/functions traversed
- trust-boundary crossings
- security-relevant decisions (authentication, authorization, validation, cryptographic operations, etc.)
- downstream privileged actions
- notes on missing validation, assumptions, or unknowns requiring runtime or deployment validation

Cross-Component Security Path Identification:

If the repository appears to participate in a larger distributed system (for example device → gateway → cloud architectures), identify any security-relevant paths that cross component boundaries.

Examples of cross-component paths include:
- device → gateway message ingestion
- gateway → cloud telemetry or command forwarding
- cloud → gateway command dispatch
- firmware build → manifest creation → firmware delivery → device verification
- device provisioning → identity establishment → certificate or key distribution

For each identified cross-component path:

- determine where this repository sits in the path
- identify the inbound trust boundary into this component
- identify the outbound trust boundary leaving this component
- identify any security assumptions about the upstream or downstream component

Document these observations in:

security-review/evidence/cross_component_security_paths.md

This document should describe:
- the overall system path
- which portion of the path is visible in this repository
- which portions exist outside this repository
- what security assumptions are made about other components

Naming guidance for code-path files:
- use descriptive names such as:
  - manager_auth_permission_path.md
  - inbound_device_message_path.md
  - firmware_delivery_path.md
  - token_validation_path.md
  - queue_to_persistence_path.md

Decision rule:
Based on the repository structure, choose the next best focused review target and explain why in 04_discovery_review_plan.md.
Do not guess randomly; derive the recommendation from the discovery results.

Finding Eligibility Rule:

Do not elevate an observation into a confirmed finding unless it is supported by repository evidence.

A confirmed finding should be tied to:
- a specific file and function or code location
- a specific security-relevant code path or privileged operation
- a clear security property that is missing, bypassed, or incorrectly enforced

If an issue appears plausible but cannot be confirmed directly from the code in scope, classify it as:
- uncertain concern requiring manual validation
or
- follow-up review target

Do not infer exploitability, exposure, or production impact unless supported by code, configuration, or clearly visible documentation in scope.

At the end:
- summarize which files were created
- identify the single highest-priority next review to run
- identify any important caveats about static-only visibility