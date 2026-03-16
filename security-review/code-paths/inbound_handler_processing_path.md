# Inbound Handler Processing Path

## Purpose of the path
Process trusted inbound MQTT-style messages after dispatch and turn them into persistence updates, Redis events, or OTA file-delivery actions.

## Entry point
- inbound SQS-delivered message routed by `routes/mqtt.route.js`

Representative commands:
- `info`
- `shell`
- `data`

## Files/functions traversed
- `services/aws.sqs.service.js:processMessage()`
- `routes/mqtt.route.js:process()`
- `middleware/mqtt-input.middleware.js:getCommand()/valInput()`
- `controllers/system.controller.js:storeSystemMetrics()`
- `controllers/system.controller.js:processSystemShellResponse()`
- `controllers/system.controller.js:processSystemGetFile()`
- `controllers/system.controller.js:processSystemDataRequest()`
- `services/system.service.js:getSystemFromThingID()/getFirmware()/getFirmwareManifest()`
- `services/redis.service.js:pubToSystem()`
- `services/aws.athena.service.js`
- `services/aws.iot.service.js:publishMessageToDevice()`

## Trust-boundary crossings
- AWS IoT/SQS message plane -> inbound dispatcher
- inbound dispatcher -> MongoDB/Redis/S3/AWS IoT publish-back

## Security-relevant decisions
- command routing is allowlisted
- validation is lightweight and mostly field/type based
- `gateway` identity is passed through as the first handler argument
- metrics are persisted for the resolved system tied to `thingID`
- shell responses are forwarded to Redis
- `data` requests can trigger firmware/manifest lookup and presigned URL publication

## Downstream privileged actions
- update backend metrics state
- publish shell output to Redis channels
- upload/cache content in S3
- generate presigned URLs
- publish file-delivery response back to device

## Unknowns requiring runtime or deployment validation
- AWS-side identity binding for inbound publishers
- downstream consumers of flexible metrics records
- device-side handling of returned URLs and retrieved artifacts
