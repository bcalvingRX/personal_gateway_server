# Inbound Device Message and Trust-Boundary Review

## Scope reviewed
- Inbound message handling from SQS receipt through MQTT payload parsing and routing.
- Validation boundaries for `info`, `shell`, and `data` commands.
- Downstream actions affecting persistence, publish-back messaging, shadow updates, and file retrieval.

## Files/functions examined
- `index.js`
- `services/aws.sqs.service.js`
- `routes/mqtt.route.js`
- `middleware/mqtt-input.middleware.js`
- `controllers/system.controller.js`
- `controllers/api.controller.js`
- `services/system.service.js`
- `services/aws.iot.service.js`
- `services/aws.athena.service.js`
- `services/redis.service.js`
- `model/w200/system-metrics-template.js`
- `model/w200/state-record-template.js`

## Traced code paths
- SQS ingestion:
  - `index.js` -> `awsSQS.startSQSReceiver(async payload => mqttRouter.process(payload))`
  - `services/aws.sqs.service.js:receiveSQSMessages()/processMessage()`
- MQTT command dispatch:
  - `routes/mqtt.route.js:process()` -> `mqtt-input.middleware.js:getCommand()/valInput()`
- Metrics persistence:
  - `command=info` -> `controllers/system.controller.js:storeSystemMetrics()` -> `services/system.service.js:getSystemFromThingID()/storeSystemMetrics()`
- Shell response fanout:
  - `command=shell` -> `controllers/system.controller.js:processSystemShellResponse()` -> Redis pub/sub
- Data/file retrieval:
  - `command=data` -> `controllers/system.controller.js:processSystemGetFile()` -> `system.service.js:getFirmware()/getFirmwareManifest()` -> external source fetch / S3 cache -> `aws.iot.service.js:publishMessageToDevice()`
- Shadow update propagation:
  - `controllers/api.controller.js:processDirtySystems()` -> `system.service.js:createStateRecord()` -> `aws.iot.service.js:updateShadowPropertyForDevice()`

## Trust assumptions observed in code
- Any message arriving on the trusted SQS subscription and matching the expected payload shape is processed.
- `mqtt-input.middleware.js` validates only command shape and basic field types.
- `gateway` in the inbound payload is treated as the device identity and is passed directly into downstream handlers.
- The file-request path trusts the requested `file` and `type` values once they pass string validation.

## Confirmed findings
1. The inbound `data` command path does not verify that the requesting gateway is authorized for the requested firmware or manifest.
   - Evidence:
   - `routes/mqtt.route.js` maps `data` directly to `systemController.processSystemGetFile()`.
   - `processSystemGetFile()` serves firmware when `systemService.getFirmware(0, file)` finds a matching `firmware_id`.
   - `processSystemGetFWManifest()` serves any manifest whose `state_hash` matches the caller-supplied `file` value.
   - No step in these handlers resolves the requesting `thingID` to a system/fleet and checks entitlement before returning a presigned URL.
   - Security effect:
   - Any principal able to publish a trusted `data` request can retrieve arbitrary known firmware IDs or manifest hashes, not just the requesting system's assigned update set.
2. Device-originated metrics are persisted with schema-level flexibility and minimal semantic validation.
   - Evidence:
   - `mqtt-input.middleware.js:reqMetrics` requires only that `record` be a JSON object.
   - `controllers/system.controller.js:storeSystemMetrics()` forwards the object to persistence after mapping `thingID` to a system.
   - `model/w200/system-metrics-template.js` uses `{ strict: false }`.
   - Security effect:
   - The backend accepts and stores arbitrary metric fields from the device side. This is a confirmed broad trust boundary, though exploitability depends on how those records are later consumed.

## Uncertain concerns requiring manual validation
- Effective publisher trust for the `gateway/send/cbor` topic likely depends on AWS IoT certificates/policies not present in this repository.
- The impact of arbitrary metric fields depends on downstream consumers, dashboards, or exports not reviewed here.
- It could not be determined whether manifest hashes are treated as sensitive identifiers in device or operational workflows.

## Reviewed areas with no confirmed issue identified
- `storeSystemMetrics()` rate-limits repeated uploads per `thingID` using a Redis key before writing metrics.
- S3 URL generation is time-limited to 10 minutes in `controllers/system.controller.js` and `services/aws.athena.service.js`.
- Dirty-system shadow updates derive state from database-backed device and fleet records rather than directly from inbound device payload contents.

## Limitations
- Static review only; no AWS IoT policy documents or live topic ACLs were available.
- Device-side firmware/manifest verification logic is outside this repository.
- The Redis pub/sub consumers for shell responses and system updates were not fully implemented in the reviewed backend.

## Recommended follow-up review targets
- AWS IoT topic policies for publishing `gateway/send/cbor` messages.
- Any downstream consumers of `SystemMetrics` documents.
- Device-side logic that consumes manifest hashes and presigned URLs.
- Operational handling of firmware identifiers and manifest hashes in logs, support tooling, and analytics.
