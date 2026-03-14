# System Service Review

## Plain English Description
This document reviews `services/system.service.js`, which is one of the most security-relevant files in the gateway server.

Earlier artifacts showed that this service sits behind several important paths:

- firmware and fleet management
- dirty-system processing
- gateway-to-system identity lookup
- metrics storage
- firmware manifest generation

This means `system.service.js` is a core backend trust-enforcement layer. It decides how systems, devices, fleets, firmware, and state records are related.

---

## Purpose
Document the security-relevant behaviors implemented in `services/system.service.js` and resolve remaining questions from earlier controller and code-path reviews.

---

## Main File in Scope

- `services/system.service.js`

Related upstream artifacts:
- `code-paths/dirty_system_processing_path.md`
- `code-paths/firmware_update_management_path.md`
- `code-paths/inbound_controller_handlers.md`
- `code-paths/system_shell_command_path.md`

---

## Confirmed Service Roles

The service is responsible for at least these major areas:

1. system and device provisioning support
2. fleet, group, and firmware relationship management
3. dirty-system lookup and dirty-bit updates
4. gateway-to-system resolution
5. system metrics storage
6. firmware manifest generation
7. deterministic state-hash generation

This confirms `system.service.js` is one of the main trust-enforcement and state-coordination layers in the repo.

---

## Gateway Identity Resolution

### Function: `getSystemByGateway(gatewayID)`

### Confirmed Behavior
The function:
1. looks up a device whose `thing_id` matches the supplied gateway ID
2. reads the `system` reference from that device
3. loads the corresponding system document
4. returns the system if found

### Security-Relevant Meaning
This is a meaningful positive control.

Inbound controller handlers do not act only on the raw claimed gateway identifier. They first attempt to map that identifier through:
- device record
- then system record

This is stronger than directly trusting the gateway string.

### Remaining Limitation
This slice confirms mapping behavior, but does not by itself prove:
- uniqueness constraints at the database level
- transport authenticity of the claimed `gatewayID`

So this is a good service-layer control, but not a full end-to-end identity guarantee.

---

## Metrics Storage

### Function: `storeSystemMetrics(systemName, record)`

### Confirmed Behavior
The function:
1. loads the target system by system name
2. reads selected fields from the supplied record object
3. updates metrics-related state in MongoDB

The service does not appear to blindly persist an arbitrary raw record blob as-is in the reviewed path. Instead, it extracts and stores specific system metrics fields.

### Security-Relevant Meaning
This is better than a fully schema-less ingest path.

It reduces risk compared with:
- storing the entire inbound metrics object untouched
- allowing arbitrary record shape to drive backend state directly

### Remaining Limitation
The upstream MQTT validator still accepts `record` as a broad object, and the service is where the actual field selection matters. This means:
- controller safety depends partly on service-side field selection
- deeper verification of exactly which fields are accepted would still be useful if this becomes a high-priority telemetry trust concern

---

## Firmware Manifest Generation

### Function: `getFirmwareManifest(systemId)`

### Confirmed Behavior
The function:
1. loads the target system
2. loads devices assigned to that system
3. loads the fleet associated with the system
4. determines which device groups are present in the system
5. filters fleet group/firmware mappings down to relevant groups
6. builds a manifest of firmware assignments for that specific system context

### Security-Relevant Meaning
This confirms manifest generation is:
- system-specific
- driven by fleet/group/firmware relationships already stored in MongoDB
- narrower than simply dumping all fleet firmware mappings

This is a positive control because firmware resolution is scoped to the actual system’s devices and update groups.

### Remaining Limitation
This path is still dependent on correctness of:
- device `update_group`
- fleet `device_groups`
- firmware references stored in MongoDB

So integrity of the manifest depends on earlier write paths being correct.

---

## Dirty-System Processing Support

### Function: `getDirtySystems(index, number)`

### Confirmed Behavior
Queries systems where:
- `dirty_flag: true`

Applies:
- sort
- skip
- limit

This is a batch-processing helper used by the dirty-system controller path.

### Function: `updateDirtyBit(systemName, value)`

### Confirmed Behavior
Updates the dirty flag for a single named system.

### Function: `setDirtyBitForFleet(fleetId)`

### Confirmed Behavior
1. loads the target fleet
2. finds all systems associated with that fleet
3. updates those systems so `dirty_flag: true`

### Security-Relevant Meaning
This confirms dirty-bit updates are not global. They are targeted:
- per system
- or per fleet-associated system set

That is a positive control because it narrows downstream update propagation.

---

## Fleet / Group / Firmware Relationship Management

### Function: `modifyFleetEntry(fleetID, groupID, firmwareID)`

### Confirmed Behavior
The function:
1. loads the target fleet
2. loads the requested firmware
3. checks whether the target group already exists in the fleet mapping
4. replaces or appends the group-to-firmware mapping
5. saves the updated fleet

### Security-Relevant Meaning
This function is the service-layer bridge between:
- administrative firmware management
- later manifest generation
- later dirty-system processing

It does not itself publish to devices. It changes backend state that later drives update behavior.

---

## System and Device Creation

### Function: `createSystem(fleetId)`

### Confirmed Behavior
The function:
1. loads the fleet
2. generates the next system name
3. creates a system marked:
- active
- dirty

### Function: `createDevice(deviceId, systemId, groupId, thingId, type)`

### Confirmed Behavior
The function:
1. checks for duplicate device ID
2. loads the referenced system
3. creates a device linked to:
- system
- update group
- optional `thing_id`
- type
4. initializes firmware-related state

### Security-Relevant Meaning
This confirms provisioning establishes the identity relationships later used by:
- gateway lookup
- manifest generation
- dirty-system processing

New systems start dirty, which intentionally feeds them into the synchronization pipeline.

---

## State Record Generation

### Function: `createStateRecord(contentArray, recordType)`

### Confirmed Behavior
The function:
1. normalizes input content into delimited strings
2. hashes each record element
3. sorts those hashes
4. hashes the combined result into a final state hash
5. upserts a stored state record in MongoDB

### Security-Relevant Meaning
This is a meaningful positive control.

It makes the sync process:
- deterministic
- order-insensitive for the underlying set
- able to compare backend/device state through compact hash records

This supports the dirty-system pipeline without directly exposing full backend structures in the shadow-update step.

---

## Confirmed Security-Relevant Observations

1. `getSystemByGateway(...)` provides a real service-layer identity mapping from gateway/device identifier to system record.
2. Dirty-bit updates are targeted to a system or a fleet’s systems, not globally applied.
3. Firmware manifest generation is system-specific and filtered to groups relevant to devices actually present in the system.
4. Metrics storage is narrower than raw blob persistence and appears to store selected backend state.
5. Provisioning intentionally feeds new systems into the dirty-system synchronization path.
6. State-record generation is deterministic and designed for hash-based synchronization.

---

## Positive Controls

- service resolves gateway identity through device → system mapping
- dirty-bit changes are targeted
- manifest generation is scoped to the requesting system’s relevant groups
- state records are deterministic and normalized before hashing
- provisioning links systems, devices, groups, and gateway IDs in a structured way

---

## Security-Relevant Limitations

### 1. Gateway trust is still upstream-dependent
The service can resolve a gateway ID to a system, but it does not prove that the sender is legitimately allowed to claim that gateway ID. That trust still depends on upstream AWS/device messaging boundaries.

### 2. Manifest integrity depends on earlier write-path correctness
Because manifest generation uses stored fleet/group/firmware relationships, any weakness in firmware-management write authorization or data integrity will flow downstream into device-facing state.

### 3. Service-layer controls do not replace route-level authorization
This file provides important backend scoping behavior, but it does not itself enforce user/session permissions for management actions. Those still depend on routes/controllers/middleware.

---

## Resolved Questions

### Does `getSystemByGateway(...)` provide a strong mapping between inbound gateway identity and one system?
Resolved partially:
- yes, the service does a real lookup through device and system records before acting
- full uniqueness/authenticity still depends on model constraints and upstream trust

### Does `storeSystemMetrics(...)` store broad arbitrary record objects or filtered backend state?
Resolved partially:
- it appears to update selected metrics-related backend fields rather than blindly persisting a raw record blob

### Is firmware manifest generation deterministic and scoped to the correct system?
Resolved:
- yes, it is system-specific and filtered to the system’s relevant device groups

### Are dirty-bit updates narrowly targeted?
Resolved:
- yes, reviewed dirty-bit updates are per system or per fleet’s systems

---

## Remaining Questions

1. Are there model-level uniqueness constraints on `thing_id` or related gateway identifiers?
2. Exactly which metrics fields are accepted and persisted by `storeSystemMetrics(...)`?
3. Are there any edge cases in manifest generation when group/firmware references are missing or inconsistent?
4. Are there any other service-layer write paths that influence effective device behavior but have not yet been traced?

---

## Impact on Earlier Artifacts

### `dirty_system_processing_path.md`
Resolved:
- the service confirms targeted dirty-system support and deterministic state-hash generation

### `firmware_update_management_path.md`
Resolved:
- service-layer fleet/group/firmware relationships directly drive later manifest generation
- firmware-management write paths are backend-state changes, not direct device publish paths

### `inbound_controller_handlers.md`
Resolved partially:
- inbound gateway lookup is a real service-layer control
- metrics storage is narrower than raw arbitrary blob persistence

### `system_shell_command_path.md`
Updated understanding:
- service-layer system relationships help define target identity and later response/update behavior, though shell command send itself is still controller-driven

---

## Findings Status

No confirmed finding is recorded from this slice yet.

The strongest remaining review themes are:
- upstream trust/authenticity of gateway identity
- firmware-management authorization sufficiency
- any unresolved operational risks around cached URLs or partially implemented paths

These are still evidence-backed review questions, not confirmed findings from this file alone.

---

## Next Review Targets

1. `model/w200/device-template.js`
   - confirm whether gateway/device identifiers such as `thing_id` have uniqueness constraints

2. `model/w200/systems-template.js`
   - confirm system/fleet relationship assumptions at the schema level

3. `controllers/fwupdatemanagement.controller.js` and route protections
   - revisit whether firmware-management write paths are appropriately permissioned

4. any code path that populates `SYSTEM_FILE_DL_URL`
   - resolve trust around cached firmware download URLs
