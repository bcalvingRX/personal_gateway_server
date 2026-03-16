# Firmware Update Management Path

## Purpose of the path
Manage firmware metadata, groups, fleets, and fleet-to-firmware assignments that later influence OTA synchronization and device retrieval behavior.

## Entry point
- manager routes under `/api/fw`

Representative write paths:
- `POST /api/fw/firmware`
- `POST /api/fw/group`
- `POST /api/fw/fleet`
- `POST /api/fw/modify`

## Files/functions traversed
- `routes/firmwareupdate.route.js`
- `middleware/input.middleware.js:reqCookie()`
- `middleware/authtoken.middleware.js:verify()`
- `middleware/input.middleware.js:reqFWParamPostFirmware()/reqFWParamPostGroup()/reqFWParamPostFleet()/reqFWParamModifyFleets()`
- `controllers/fwupdatemanagement.controller.js:saveFirmware()/saveGroup()/saveFleet()/modifyFleet()`
- `services/system.service.js:saveFirmware()/saveGroup()/saveFleet()/modifyFleetEntry()/setDirtyBitForFleet()`
- `services/github.service.js`
- `services/greenlightguru.service.js`

## Trust-boundary crossings
- manager client -> manager app
- manager app -> MongoDB firmware/group/fleet state
- manager app -> external firmware sources (GitHub / GLG)

## Security-relevant decisions
- route authorization currently uses `SYSTEM:view` for both read and write firmware-management routes
- firmware registration checks duplicate IDs and upstream source existence
- fleet modification changes persistent targeting state and sets dirty flags on affected systems
- device-facing effects occur later through dirty-system processing rather than direct device publish in this path

## Downstream privileged actions
- create OTA metadata records
- alter fleet targeting
- trigger future synchronization to deployed systems by setting dirty flags

## Unknowns requiring runtime or deployment validation
- whether `SYSTEM:view` is intentionally sufficient for these writes
- whether additional approval or integrity controls exist outside the repo before deployment of registered firmware
- how devices validate downloaded firmware after retrieval
