You are performing a quick security reconnaissance of this repository to create a high-level **Security Map**.

This is NOT a full security review. The goal is to quickly identify the system structure, entry points, trust boundaries, and likely security-sensitive areas to guide later discovery and focused review.

Do not generate vulnerability findings in this step.

## Tasks

Analyze the repository structure and identify:

### 1. System Entry Points
Identify external entry points where untrusted data or external actors interact with the system, such as:

- HTTP / REST / GraphQL routes
- message queues or event consumers
- MQTT or device communication handlers
- CLI tools or admin scripts
- scheduled jobs or background workers
- RPC or internal service interfaces
- device protocol handlers

List the files or modules implementing these entry points.

---

### 2. Security-Relevant Modules

Identify modules likely responsible for security logic such as:

- authentication
- authorization / permissions
- identity handling
- cryptography or signature verification
- certificate or key management
- token validation
- firmware update handling
- device provisioning
- configuration or command execution

List the relevant files and directories.

---

### 3. Trust Boundaries

Identify potential trust boundaries such as:

- internet → backend service
- device → gateway
- gateway → cloud service
- admin UI → API service
- queue/event bus → worker
- firmware storage → delivery service

Note where validation or security controls would typically be expected.

---

### 4. Privileged Operations

Identify code locations performing potentially sensitive or privileged actions, such as:

- firmware distribution
- shell command execution
- configuration changes
- device control commands
- security policy changes
- credential or key handling
- database writes affecting device state

List the functions or modules responsible.

---

### 5. Candidate High-Risk Code Paths

Based on the entry points and privileged operations identified above, list **3–5 candidate security-relevant code paths** that may require deeper analysis during discovery.

Example format:

Entry point → controller/service → privileged action

---

## Output Artifact

Create the artifact:

security-review/evidence/security_map.md

Include the following sections:

- Repository overview
- Identified entry points
- Security-relevant modules
- Trust boundaries
- Privileged operations
- Candidate high-risk code paths

This document should guide the **Discovery phase** that follows.