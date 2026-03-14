# Firmware Update Management Path

## Plain English Description
This document explains how the gateway server manages firmware, groups, and fleets for connected systems.

These routes let a manager user view and modify firmware-related records in the backend. The code supports:
- creating firmware records
- creating groups
- creating fleets
- assigning firmware to groups inside a fleet
- marking systems in that fleet as dirty so they can be processed later

This path matters because it controls the backend state that can influence what firmware devices should receive.

## Purpose
Trace the manager-side firmware and fleet management flow and identify where it changes backend state versus where it directly communicates with devices.

## Route Entry

**File:** `routes/firmwareupdate.route.js`

All routes are mounted under:
`/api/fw`

### Read routes
- `GET /api/fw/firmware`
- `GET /api/fw/firmwareCount`
- `GET /api/fw/groups`
- `GET /api/fw/groupCount`
- `GET /api/fw/fleetDetails`
- `GET /api/fw/fleets`
- `GET /api/fw/fleetCount`

### Write routes
- `POST /api/fw/firmware`
- `POST /api/fw/group`
- `POST /api/fw/fleet`
- `POST /api/fw/modify`

## Common Middleware Pattern

Most firmware routes use this pattern:

1. `paramMid.reqCookie()`
2. `auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW)`
3. route-specific validator
4. controller handler

## Validation

**File:** `middleware/input.middleware.js`

Confirmed pattern:
- manager routes require `reqCookie()`
- route-specific validators sanitize request parameters
- validated values are copied into `res.locals.data`

For firmware write paths, validators exist for:
- posting firmware
- posting groups
- posting fleets
- modifying fleets

## Authorization

**File:** `middleware/authtoken.middleware.js`

Confirmed route protection:
- both read and write firmware-management routes use `auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW)`

Security-relevant observation:
- write routes appear to use the same `SYSTEM + VIEW` permission used by read routes
- no stronger permission such as ADD, EDIT, APPLY, or CONTROL is visible on these routes

This is a code-confirmed design observation and should be reviewed further.

## Controller Behavior

**File:** `controllers/fwupdatemanagement.controller.js`

### `saveFirmware()`
Reads from `res.locals.data`:
- `source`
- `firmwareID`
- `description`
- `file`
- source-specific values such as `revisionID` or `org/repo/tag`

Behavior:
- checks for duplicate firmware ID
- checks whether a matching firmware source record already exists
- validates source existence through:
  - `greenlightGuruService.checkFirmwareExists(...)` for `glg`
  - `githubService.checkFirmwareExists(...)` for `gh`
- if checks pass, saves firmware metadata through `systemService.saveFirmware(...)`

This path stores firmware metadata in the database. It does not directly push firmware to devices.

### `saveGroup()`
Behavior:
- checks for duplicate group ID
- creates a new group through `systemService.saveGroup(...)`

### `saveFleet()`
Behavior:
- checks for duplicate fleet ID
- creates a new fleet through `systemService.saveFleet(...)`

### `modifyFleet()`
Reads:
- `fleetID`
- `modifications`

For each modification entry:
- extracts `group_id`
- extracts `firmware_id`
- calls `systemService.modifyFleetEntry(fleetID, group_id, firmware_id)`

After all modifications:
- calls `systemService.setDirtyBitForFleet(fleetID)`

This is the most important write path in this module because it changes fleet-to-group-to-firmware assignments and then marks enrolled systems as dirty.

## Service Behavior

**File:** `services/system.service.js`

### `saveFirmware(...)`
Creates a firmware document in MongoDB.
Supported sources:
- `glg`
- `gh`

Stored metadata can include:
- firmware ID
- description
- source
- revision
- org
- repo
- tag
- file

### `saveGroup(...)`
Creates a group document in MongoDB.

### `saveFleet(...)`
Creates a fleet document in MongoDB.

### `modifyFleetEntry(fleetID, groupID, firmwareID)`
Behavior:
- loads target fleet
- loads requested firmware
- looks for an existing group entry in the fleet
- if group already exists, replaces its firmware reference
- otherwise loads the group and adds a new group/firmware mapping to the fleet
- saves the updated fleet document

### `setDirtyBitForFleet(fleetId)`
Behavior:
- loads the fleet
- updates all systems assigned to that fleet
- sets `dirty_flag: true`

This confirms the firmware-management path affects downstream system processing by updating database state and marking systems for later handling.

## Device / External Boundary

From the code reviewed in this slice:

- firmware-management routes do **not** directly publish commands to AWS IoT
- firmware-management routes primarily update backend metadata and fleet assignment state
- downstream device impact likely happens later through dirty-system processing or another synchronization path

This means the firmware-management path is an indirect device-control path, not a direct publish path like shell commands.

## Positive Controls

- route-specific validators exist for write operations
- controller logic uses `res.locals.data`
- duplicate checks exist for firmware IDs, group IDs, and fleet IDs
- source-specific existence checks are performed before saving firmware metadata
- fleet modification marks affected systems dirty for later processing

## Confirmed Security-Relevant Observations

1. Firmware-management write routes are present and active.
2. These routes modify backend state that can influence firmware rollout behavior.
3. Write routes appear to require only `SYSTEM + VIEW`, the same permission used for read routes.
4. Firmware save performs existence checks against external sources before storing metadata.
5. Fleet modification updates firmware/group mappings and marks related systems dirty.
6. This slice does not itself show direct device publishing; downstream propagation likely occurs elsewhere.

## Follow-Up Questions

These are not findings yet.

1. Is `SYSTEM + VIEW` intentionally sufficient for firmware, group, fleet, and modify write routes?
2. What later process consumes `dirty_flag` and turns these backend changes into device-facing update actions?
3. Are there any additional approval or integrity controls before a firmware record can influence deployed systems?
4. Do source existence checks also verify artifact integrity, or only presence?
5. Are firmware records tied to signed or trusted artifacts elsewhere in the system?

## Next Review Targets

1. `services/system.service.js`
   - trace dirty-system processing and firmware-manifest logic more deeply

2. `controllers/api.controller.js`
   - review provisioning and dirty-system processing routes

3. `services/aws.sqs.service.js`
   - determine whether update propagation or backend processing uses SQS

4. `model/w200/firmware-template.js`
   - confirm what firmware metadata is actually stored

5. device/backend update consumer path
   - identify where fleet/group/firmware assignments become device actions