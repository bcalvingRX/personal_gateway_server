# Initial Architecture and Attack Surface Analysis

## Scope reviewed
- refreshed discovery outputs `00` through `05`
- manager and automation HTTP entry points
- inbound AWS SQS -> MQTT message path
- major privileged operations and OTA-related external integrations

## Discovery inputs used
- `security-review/00_review_charter.md`
- `security-review/01_architecture_notes.md`
- `security-review/02_trust_boundaries.md`
- `security-review/03_security_file_inventory.md`
- `security-review/04_gateway_architecture_overview.md`
- `security-review/05_critical_security_surfaces.md`
- `security-review/evidence/security_map.md`
- `security-review/evidence/privileged_operations_inventory.md`
- `security-review/evidence/cross_component_security_paths.md`

## Files/functions examined
- `index.js`
- `apps/manager-app.js`
- `apps/api-app.js`
- `routes/api.route.js`
- `routes/authentication.route.js`
- `routes/usermanagement.route.js`
- `routes/system.route.js`
- `routes/firmwareupdate.route.js`
- `routes/report.route.js`
- `routes/mqtt.route.js`
- `middleware/input.middleware.js`
- `middleware/authtoken.middleware.js`
- `middleware/mqtt-input.middleware.js`
- `controllers/api.controller.js`
- `controllers/system.controller.js`
- `controllers/fwupdatemanagement.controller.js`
- `controllers/usermanagement.controller.js`
- `controllers/authentication.controller.js`
- `services/user.service.js`
- `services/system.service.js`
- `services/aws.sqs.service.js`
- `services/aws.iot.service.js`
- `services/aws.athena.service.js`
- `services/github.service.js`
- `services/greenlightguru.service.js`
- `services/redis.service.js`

## Traced code paths
- manager auth and permission path:
  - manager request -> `reqCookie()` -> `auth.verify()` -> user/group permission lookup -> manager controller
- automation dirty-system path:
  - `GET /api/processDirtySystems` -> `verifyAPIKey()` -> `processDirtySystems()` -> `createStateRecord()` -> `updateShadowPropertyForDevice()`
- inbound message path:
  - SQS message -> `routes/mqtt.route.js:process()` -> command validation -> `storeSystemMetrics()` / `processSystemShellResponse()` / `processSystemGetFile()`
- OTA management path:
  - manager firmware/fleet update -> persistent state change -> `setDirtyBitForFleet()` -> later dirty-system processing
- device retrieval path:
  - inbound `data` command -> firmware/manifest lookup -> S3 cache/presigned URL generation -> AWS IoT publish-back

## Confirmed findings
1. Manager-route identity is derived from request metadata rather than a verified server-side session.
   - Evidence:
     - `reqCookie()` requires `useremail` header and non-empty `sessID` cookie.
     - `auth.verify()` authorizes using `res.locals.data.useremail`.
     - session middleware exists in `apps/manager-app.js`, but the reviewed auth path does not require `req.session.user`.
   - Why it matters architecturally:
     - the main manager trust boundary depends on how identity metadata reaches the app.
2. First-user bootstrap is embedded in the runtime authorization path.
   - Evidence:
     - `auth.verify()` calls `userService.createUser(email)`.
     - `createUser()` assigns `Admin Group` when the user store is empty.
   - Why it matters architecturally:
     - initial identity bootstrap is not separated from normal request handling.

## Uncertain concerns requiring manual validation
- whether ingress/proxy infrastructure rewrites or constrains `useremail` before requests reach the manager app
- whether production seed state prevents exposure of the first-user-admin bootstrap path
- whether AWS IoT/SQS policies limit trusted inbound publishers as assumed by the backend
- whether device-side OTA logic enforces firmware integrity independently of the backend

## Limitations
- static review only; no live ingress, AWS, Redis, MongoDB, or device behavior was validated
- broader system components referenced in the code paths are outside this repository
- route protection and trust assumptions were assessed from code and existing artifacts, not from deployed traffic

## Recommended follow-up review targets
- `07_authorization_access_control_review.md`
  - highest-priority because it governs several manager-side privileged operations
- `08_inbound_device_message_trust_boundary_review.md`
  - to validate the inbound message trust boundary and device-originated operations
- `09_firmware_manifest_file_delivery_ota_review.md`
  - to validate OTA trust assumptions, integrity handling, and delivery orchestration
