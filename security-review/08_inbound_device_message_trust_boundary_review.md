# Inbound Device Message Trust-Boundary Review

## Scope reviewed
- inbound message handling from AWS SQS receipt through MQTT-style command routing
- validation boundaries before controller dispatch
- downstream operations affecting persistence, Redis fanout, publish-back, and OTA retrieval

## Discovery inputs used
- `security-review/02_trust_boundaries.md`
- `security-review/04_gateway_architecture_overview.md`
- `security-review/05_critical_security_surfaces.md`
- `security-review/evidence/message_ingestion_inventory.md`
- `security-review/evidence/mqtt_input_validation_review.md`
- `security-review/evidence/privileged_operations_inventory.md`
- `security-review/code-paths/inbound_handler_processing_path.md`

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

## Traced code paths
- inbound message receipt:
  - `index.js` -> `startSQSReceiver()` -> `processMessage()`
- command dispatch:
  - `routes/mqtt.route.js:process()` -> base command validation -> command-specific validation
- metrics persistence:
  - `info` -> `storeSystemMetrics()` -> `getSystemFromThingID()` -> `storeSystemMetrics()`
- shell response forwarding:
  - `shell` -> `processSystemShellResponse()` -> `redisService.pubToSystem()`
- data/file retrieval:
  - `data` -> `processSystemGetFile()` -> firmware/manifest lookup -> S3 cache/presigned URL -> `publishMessageToDevice()`

## Confirmed findings
1. The inbound `data` path serves firmware or manifest content based on requested identifiers without a visible gateway-to-fleet entitlement check.
   - Evidence:
     - `reqDataResp` validates only `file`, `type`, and `offset`.
     - `processSystemGetFile()` resolves firmware by `firmware_id` and manifest by `state_hash`.
     - no reviewed step checks that the requesting `thingID` is entitled to the requested artifact before URL issuance.
2. Device-originated metrics are accepted with broad schema flexibility.
   - Evidence:
     - `reqMetrics` only requires `record` to be an object.
     - `model/w200/system-metrics-template.js` uses `strict: false`.
   - Security property affected:
     - trust boundary between device-originated data and persisted backend state.

## Uncertain concerns requiring manual validation
- whether AWS IoT identity and topic policy constrain who can publish trusted inbound messages
- what downstream consumers assume about the structure and trustworthiness of stored metrics
- whether manifest hashes are considered sensitive identifiers in the broader system

## Limitations
- no live AWS IoT/SQS policy or message-capture validation was performed
- device firmware generating inbound traffic is outside repository scope
- downstream services reading Redis or `SystemMetrics` were not fully visible in the repo

## Recommended follow-up review targets
- validate AWS IoT publisher restrictions and thing identity binding
- review downstream uses of `SystemMetrics`
- correlate device-side behavior for manifest and firmware retrieval requests
