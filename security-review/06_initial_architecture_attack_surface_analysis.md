# Initial Architecture and Attack Surface Analysis

## Scope reviewed
- Repository-level architecture relevant to authentication, authorization, device communications, firmware delivery, and external integrations.
- HTTP entrypoints in the manager and API applications.
- Inbound device-message processing from SQS into MQTT command routing.
- Firmware manifest and file-delivery orchestration.

## Files/functions examined
- `index.js`
- `apps/manager-app.js`
- `apps/api-app.js`
- `routes/authentication.route.js`
- `routes/usermanagement.route.js`
- `routes/system.route.js`
- `routes/firmwareupdate.route.js`
- `routes/api.route.js`
- `routes/mqtt.route.js`
- `middleware/input.middleware.js`
- `middleware/authtoken.middleware.js`
- `middleware/mqtt-input.middleware.js`
- `middleware/rate-limit.middleware.js`
- `controllers/authentication.controller.js`
- `controllers/usermanagement.controller.js`
- `controllers/system.controller.js`
- `controllers/fwupdatemanagement.controller.js`
- `controllers/api.controller.js`
- `services/user.service.js`
- `services/system.service.js`
- `services/aws.sqs.service.js`
- `services/aws.iot.service.js`
- `services/aws.athena.service.js`
- `services/github.service.js`
- `services/greenlightguru.service.js`
- `services/redis.service.js`
- `model/user.js`
- `model/user-group.js`
- `model/gateway-permissions.js`
- `model/w200/device-template.js`
- `model/w200/firmware-template.js`
- `model/w200/fleet-template.js`
- `model/w200/state-record-template.js`
- `model/w200/system-metrics-template.js`

## Major components and trust boundaries
- `index.js` initializes MongoDB, Redis, AWS SQS, AWS IoT, and S3/Athena helpers, then starts two HTTPS Express apps and an SQS polling loop.
- `apps/manager-app.js` exposes operator-facing routes under `/api/auth`, `/api/users`, `/api/report`, `/api/system`, and `/api/fw`.
- `apps/api-app.js` exposes API-key-protected routes under `/api` for provisioning systems and processing dirty systems.
- `routes/mqtt.route.js` is not an HTTP route; it dispatches inbound device-originated MQTT payloads received through SQS.
- Redis is used for session storage, pub/sub, cached permissions, and coarse-grained S3/SQS locks.
- AWS IoT is used for device shadow updates and publish-back messages to gateways.
- AWS S3 presigned URLs are used to deliver firmware binaries, manifests, and random data to gateways.
- GitHub and Greenlight Guru are upstream firmware sources.

## Security-relevant code paths traced
- Manager authn/authz: `apps/manager-app.js` -> `middleware/input.middleware.js:reqCookie()` -> `middleware/authtoken.middleware.js:verify()` -> manager controllers/services.
- API-key provisioning: `routes/api.route.js` -> `middleware/input.middleware.js:reqRegToken()` -> `middleware/authtoken.middleware.js:verifyAPIKey()` -> `controllers/api.controller.js:provisionSystem()`.
- Dirty-system orchestration: `routes/api.route.js` -> `controllers/api.controller.js:processDirtySystems()` -> `services/system.service.js:getDirtySystems()/createStateRecord()/updateDirtyBit()` -> `services/aws.iot.service.js:updateShadowPropertyForDevice()`.
- Inbound device messages: `services/aws.sqs.service.js:startSQSReceiver()` -> `routes/mqtt.route.js:process()` -> `middleware/mqtt-input.middleware.js` -> `controllers/system.controller.js`.
- Firmware delivery: device `data` request -> `controllers/system.controller.js:processSystemGetFile()` -> `services/system.service.js:getFirmware()/getFirmwareManifest()` -> `services/github.service.js` or `services/greenlightguru.service.js` -> `services/aws.athena.service.js:uploadToS3()/getEphemeralURL()` -> `services/aws.iot.service.js:publishMessageToDevice()`.

## Attack surface observations
- Operator-facing HTTPS manager API on port `9422`.
- API-key HTTPS API on port `5445`.
- Inbound SQS-fed MQTT command path handling `info`, `shell`, and `data` commands.
- Redis-backed session and pub/sub surfaces.
- External trust on GitHub, GLG, AWS IoT, AWS SQS, AWS S3, MongoDB, and Redis.
- TLS server key/cert loading is present in `index.js`, but client-certificate enforcement for users or devices is not shown in the reviewed routes.

## Auth/authz logic identified
- Manager routes use `auth.verify(location, permission)` with permissions loaded from MongoDB/Redis-backed user groups.
- API routes use `verifyAPIKey()` against MD5-hashed API keys in MongoDB.
- `verifyInstrument()` exists but no reviewed route invoked it.

## Device communications, crypto/integrity, firmware, and key-handling observations
- Device-originated messages are trusted once they arrive through the SQS/MQTT pipeline; validation is schema-level only in `middleware/mqtt-input.middleware.js`.
- Fleet and device state records use `imurmurhash` in `services/system.service.js:createStateRecord()`; this is a non-cryptographic hash over identifiers, not over firmware file contents.
- Firmware binaries are fetched from GitHub or GLG, cached in S3, and returned as short-lived presigned URLs.
- TLS server keys/certs are read from `KEY_FILE` and `CERT_FILE` in `index.js`.

## Confirmed findings
1. Manager-route identity is derived from a caller-controlled `useremail` header plus only the presence of a `sessID` cookie, not from a verified server-side session. `reqCookie()` only validates header and cookie existence, then `auth.verify()` authorizes on `res.locals.data.useremail`; the manager app logs `req.session.user` but the reviewed authorization path does not require it.
2. The first unknown user reaching `auth.verify()` is automatically created in `Admin Group` when the user collection is empty. `userService.createUser()` assigns `Admin Group` when `getNumUsers()` returns `0`.

## Uncertain concerns requiring manual validation
- Deployment may place an authenticating reverse proxy or gateway in front of the manager app that overwrites or strips `useremail`; that cannot be determined from this repository alone.
- Initial database seeding may ensure the first-user-admin bootstrap path is never reachable in production; that cannot be confirmed statically.
- Device authentication may rely on AWS IoT policy/certificate controls outside this repository; the repo alone cannot prove the effective publisher set for inbound MQTT/SQS traffic.

## Limitations
- Static review only; no live traffic, AWS policy, proxy, or identity-provider configuration was available.
- No runtime verification of session contents, ingress header handling, or IoT policy enforcement was performed.
- Device firmware/client-side validation logic is outside this repository.

## Recommended follow-up review targets
- Deployment and ingress configuration that sets or validates `useremail`.
- Session creation/login flow in the frontend or upstream auth layer that is expected to bind identity to `sessID`.
- AWS IoT topic policies and SQS subscription configuration for gateway devices.
- Database seed/migration scripts establishing initial users, groups, and permissions.
