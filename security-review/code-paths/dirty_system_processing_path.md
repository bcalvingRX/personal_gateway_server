# Dirty System Processing Path

## Plain English Description
This document explains how the gateway server processes systems that have been marked as "dirty".

A system becomes dirty when backend state changes that may affect the system configuration or firmware assignments. Dirty systems must be processed so the backend can generate the correct state or update instructions.

This path is important because it is where backend administrative changes eventually propagate toward devices.

---

## Entry Point

Route file: `routes/api.route.js`

Endpoint:

POST /api/processDirtySystems

Purpose:
Trigger processing of systems whose `dirty_flag` is set.

Security relevance:
This is an operational backend endpoint that can initiate synchronization or update workflows.

---

## Authorization

Middleware: `verifyAPIKey()`

Behavior:
- reads `authorization` header
- hashes the API key
- verifies existence in the APIKey collection

Only callers with a valid API key can trigger dirty-system processing.

---

## Controller Behavior

File: `controllers/api.controller.js`

Function: `processDirtySystems()`

Behavior:
1. calls `systemService.getDirtySystems(index, number)`
2. iterates over returned systems
3. performs system processing logic
4. clears the system dirty flag when processing completes

This confirms that the dirty-system path is a batch-processing operation.

---

## Service Behavior

File: `services/system.service.js`

### getDirtySystems(index, number)

Behavior:
- queries MongoDB for systems where `dirty_flag = true`
- applies pagination using `skip` and `limit`
- returns systems for processing

### updateDirtyBit(systemName, value)

Behavior:
- updates a system record
- sets `dirty_flag` true or false

### setDirtyBitForFleet(fleetId)

Behavior:
1. loads the fleet
2. finds systems associated with that fleet
3. sets `dirty_flag = true` for those systems

This confirms that fleet-level firmware or configuration changes propagate to systems through the dirty flag mechanism.

---

## Dirty Flag Lifecycle

Dirty flag may be set when:

- fleet firmware assignments change
- group membership changes
- system configuration changes
- provisioning creates a new system

Dirty systems are later consumed by the processing endpoint.

Lifecycle:

backend change  
→ system marked dirty  
→ dirty-system processor runs  
→ system processed  
→ dirty flag cleared

---

## Relationship to Firmware Updates

Earlier review confirmed:

`controllers/fwupdatemanagement.controller.js`

After fleet modifications:

`systemService.setDirtyBitForFleet(fleetID)`

This causes all systems in that fleet to be reprocessed.

This confirms the firmware-management path feeds into the dirty-system pipeline.

---

## External Boundaries

The dirty-system processing path interacts with:

- MongoDB (system state)
- firmware/group/fleet metadata
- potentially downstream device messaging or update logic

The exact device-facing behavior depends on what happens inside the processing logic.

---

## Positive Controls

- API key authentication required
- pagination limits system batch size
- dirty flag isolates affected systems
- backend state changes do not immediately affect devices

---

## Security-Relevant Observations

1. Dirty-system processing is API-triggered.
2. API key protection isolates the endpoint from session-based manager access.
3. Dirty flags ensure targeted processing instead of global updates.
4. Firmware-management operations rely on this path to propagate state changes.

---

## Follow-Up Questions

These are not findings yet.

1. What exact operations occur during system processing?
2. Does processing publish device update messages?
3. Can dirty-system processing be triggered repeatedly or concurrently?
4. Are API keys scoped or rate-limited for operational endpoints?

---

## Next Review Targets

1. `services/system.service.js`
2. `controllers/system.controller.js`
3. `services/aws.sqs.service.js`
4. downstream device update path