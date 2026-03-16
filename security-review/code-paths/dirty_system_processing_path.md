# Dirty System Processing Path

## Purpose of the path
Translate backend state changes into device-visible synchronization state by recomputing hashes and updating AWS IoT desired shadow properties.

## Entry point
- `GET /api/processDirtySystems`

## Files/functions traversed
- `routes/api.route.js`
- `middleware/input.middleware.js:reqRegToken()`
- `middleware/authtoken.middleware.js:verifyAPIKey()`
- `controllers/api.controller.js:processDirtySystems()`
- `controllers/api.controller.js:processSystem()`
- `services/system.service.js:getDirtySystems()`
- `services/system.service.js:getDevicesForSystem()`
- `services/system.service.js:createStateRecord()`
- `services/system.service.js:updateDirtyBit()`
- `services/aws.iot.service.js:updateShadowPropertyForDevice()`

## Trust-boundary crossings
- automation client -> API app
- API app -> MongoDB system/fleet/device state
- API app -> AWS IoT shadow update channel

## Security-relevant decisions
- API-key auth protects the entry point
- only systems with `dirty_flag: true` are processed
- device hash and fleet hash are recomputed from persistent backend state
- successful processing clears dirty flag on the system

## Downstream privileged actions
- update AWS IoT desired shadow values `DH` and `FH`
- change device-visible synchronization state

## Unknowns requiring runtime or deployment validation
- API key operational scoping and caller restrictions
- concurrency behavior across replicas and retries
- device-side interpretation and enforcement of shadow hash changes
