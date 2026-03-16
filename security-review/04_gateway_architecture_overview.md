# Discovery Review Plan

## Purpose
This file ranks the next focused review targets based on the refreshed discovery outputs, security map, trust boundaries, privileged operations, and traced code paths.

## Prioritized security-relevant code paths
### 1. Manager auth and permission path
- Priority: critical
- Code-path artifact: `security-review/code-paths/manager_auth_permission_path.md`
- Reasoning:
  - establishes manager identity and route authorization
  - gates user/group administration, system control, and firmware operations
  - depends on a sensitive trust boundary between request metadata and authorization state
- Recommended focused review artifact:
  - `07_authorization_access_control_review.md`

### 2. Inbound device-message processing and file-delivery path
- Priority: critical
- Code-path artifacts:
  - `security-review/code-paths/inbound_handler_processing_path.md`
  - `security-review/code-paths/inbound_messaging_control_plane.md`
- Reasoning:
  - crosses the device/cloud message trust boundary
  - dispatches externally supplied input into persistence, Redis pub/sub, and OTA file delivery logic
  - includes firmware/manifest retrieval requests and metrics ingestion
- Recommended focused review artifact:
  - `08_inbound_device_message_trust_boundary_review.md`

### 3. Firmware and fleet management to OTA propagation path
- Priority: critical
- Code-path artifact: `security-review/code-paths/firmware_update_management_path.md`
- Reasoning:
  - controls firmware metadata, fleet targeting, and dirty-flag propagation
  - influences what devices will later retrieve
  - crosses manager/admin trust boundary into persistent OTA state
- Recommended focused review artifact:
  - `09_firmware_manifest_file_delivery_ota_review.md`

### 4. Dirty-system processing and device shadow synchronization path
- Priority: high
- Code-path artifact: `security-review/code-paths/dirty_system_processing_path.md`
- Reasoning:
  - translates backend state changes into AWS IoT desired shadow updates
  - is API-key-triggered and operationally privileged
  - bridges manager/backend changes into device-visible synchronization state
- Recommended focused review artifact:
  - `06_initial_architecture_attack_surface_analysis.md`

### 5. System shell command control path
- Priority: high
- Code-path artifact: `security-review/code-paths/system_shell_command_path.md`
- Reasoning:
  - publishes operator-supplied commands to deployed systems
  - high-sensitivity privileged action even when route authorization is present
- Recommended focused review artifact:
  - `07_authorization_access_control_review.md`

### 6. User/group mutation and permission cache invalidation path
- Priority: high
- Code-path artifacts:
  - `security-review/code-paths/usermanagement_controller_path.md`
  - `security-review/code-paths/permission_cache_invalidation_path.md`
- Reasoning:
  - changes authorization state and cache correctness
  - important for determining whether route protection is consistently enforced over time
- Recommended focused review artifact:
  - `07_authorization_access_control_review.md`

## Recommended next 3 to 6 focused review targets
1. Authorization and access control across manager routes
   - Why it matters:
     - authorization gates the highest-value manager surfaces
     - the manager trust boundary depends on request-derived identity and group permissions
   - Artifact to produce/update next:
     - `07_authorization_access_control_review.md`

2. Inbound device-message and trust-boundary review
   - Why it matters:
     - inbound MQTT/SQS traffic can trigger persistence, publish-back, and OTA retrieval behavior
   - Artifact to produce/update next:
     - `08_inbound_device_message_trust_boundary_review.md`

3. Firmware manifest, file-delivery, and OTA orchestration review
   - Why it matters:
     - firmware metadata and fleet targeting directly influence downstream device update state
   - Artifact to produce/update next:
     - `09_firmware_manifest_file_delivery_ota_review.md`

4. Architecture and attack-surface consolidation
   - Why it matters:
     - discovery identified multiple interacting entry points and trust boundaries that need a single evidence-backed view
   - Artifact to produce/update next:
     - `06_initial_architecture_attack_surface_analysis.md`

5. Shell command and follow-up control path validation
   - Why it matters:
     - remote command publication remains one of the most privileged operations in the codebase
   - Artifact to produce/update next:
     - supporting updates in `security-review/code-paths/` and `07_authorization_access_control_review.md`

## Single highest-priority next review
`07_authorization_access_control_review.md`

Reasoning:
- it directly governs the manager-side trust boundary into user/group mutation, system control, and firmware/fleet management
- discovery shows multiple high-value routes share the same authorization path
- resolving this surface clarifies the security posture of several other privileged operations

## Caveats
- prioritized targets are derived from repository code and visible configuration only
- cloud policy, ingress behavior, device-side logic, and seed/bootstrap procedures still require manual validation
