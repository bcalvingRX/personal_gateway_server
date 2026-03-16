# Update Flow Inventory

## Firmware metadata registration
- Entry point:
  - `POST /api/fw/firmware`
- Key files/functions:
  - `routes/firmwareupdate.route.js`
  - `controllers/fwupdatemanagement.controller.js:saveFirmware()`
  - `services/system.service.js:saveFirmware()`
  - `services/github.service.js`
  - `services/greenlightguru.service.js`

## Fleet targeting changes
- Entry point:
  - `POST /api/fw/modify`
- Key files/functions:
  - `controllers/fwupdatemanagement.controller.js:modifyFleet()`
  - `services/system.service.js:modifyFleetEntry()`
  - `services/system.service.js:setDirtyBitForFleet()`

## Dirty-system synchronization
- Entry point:
  - `GET /api/processDirtySystems`
- Key files/functions:
  - `controllers/api.controller.js:processDirtySystems()`
  - `controllers/api.controller.js:processSystem()`
  - `services/system.service.js:createStateRecord()`
  - `services/aws.iot.service.js:updateShadowPropertyForDevice()`

## Device retrieval path
- Entry point:
  - inbound MQTT `data` command
- Key files/functions:
  - `controllers/system.controller.js:processSystemGetFile()`
  - `controllers/system.controller.js:processSystemDataRequest()`
  - `services/aws.athena.service.js:getEphemeralURL()`

## Discovery observations
- OTA flow is state-driven: manager writes state first, then dirty processing updates device-visible shadow values
- backend mediates actual file delivery by generating presigned URLs
- backend integrity verification of firmware binaries is not visible in discovery paths
