# Security Review Charter

## Plain English Description
This workspace documents a structured, evidence-oriented secure code review of the `walkasins-gateway-server` repository.

The review is being performed as part of a controlled pilot of AI-assisted secure code review for RxFunction product software. The goal is to identify security-relevant files, trace important code paths, review narrow modules, and produce outputs that are useful without creating speculative or unsupported findings.

This review is intended to support internal engineering and security work. It does not replace manual review, standard scanning, verification testing, runtime validation, hardware testing, or independent third-party testing.

---

## Repository
`walkasins-gateway-server`

## Review Goals
- understand the architecture of the gateway server
- identify major trust boundaries
- map externally reachable attack surface
- review authentication and validation controls
- trace high-risk code paths
- record only code-grounded observations
- separate confirmed findings from unresolved questions
- identify what requires runtime, cloud, or hardware validation

## Review Method
The review follows a structured sequence:

1. architecture mapping
2. trust boundary identification
3. security-relevant file inventory
4. API attack surface mapping
5. authentication and validation review
6. high-risk code-path tracing
7. evidence consolidation
8. findings creation only when code-supported

## Review Principles
- avoid speculative vulnerability generation
- focus on architecture understanding and trust boundaries
- tie observations to code paths in scope
- keep findings separate from evidence
- call out uncertainty explicitly
- identify where static review is insufficient

## Expected Artifacts
Artifacts in this workspace may include:
- architecture notes
- trust boundaries
- security-relevant file inventory
- API endpoint map
- auth/validation review
- code-path traces
- evidence reviews
- findings
- workflow status and final instructions

## Scope Notes
The repository appears to implement a gateway/backend service that interacts with:
- manager-facing administrative functionality
- backend automation/API-key flows
- AWS IoT
- AWS SQS
- Redis
- MongoDB
- firmware and fleet metadata
- connected gateway/device systems

## Deliverable Style
The review artifacts should be:
- readable by humans
- useful to other AI tools
- structured for later threat modeling
- suitable for internal engineering/security handoff
