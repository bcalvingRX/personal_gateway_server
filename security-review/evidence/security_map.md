# Security Map

## Repository overview
`walkasins-gateway-server` is a backend/cloud support service for gateway and device fleet management. It exposes two HTTPS Express apps, processes inbound device messages through AWS SQS, stores control state in MongoDB, uses Redis for sessions/cache/pub-sub, and mediates OTA file delivery through S3 presigned URLs.

## Identified entry points
### HTTP / REST entry points
- `apps/manager-app.js`
  - `/api/auth`
  - `/api/users`
  - `/api/report`
  - `/api/system`
  - `/api/fw`
- `apps/api-app.js`
  - `/api/provisionSystem`
  - `/api/processDirtySystems`

### Message / device entry points
- `services/aws.sqs.service.js:startSQSReceiver()`
- `routes/mqtt.route.js:process()`
  - `info`
  - `shell`
  - `data`

### Background/worker behavior
- SQS polling loop initialized in `index.js`
- dirty-system processing triggered via HTTP automation endpoint rather than an in-repo scheduler

## Security-relevant modules
- Authentication/authorization:
  - `middleware/authtoken.middleware.js`
  - `middleware/input.middleware.js`
  - `services/user.service.js`
  - `model/user.js`
  - `model/user-group.js`
  - `model/gateway-permissions.js`
- Inbound message validation/dispatch:
  - `middleware/mqtt-input.middleware.js`
  - `routes/mqtt.route.js`
  - `services/aws.sqs.service.js`
- OTA / firmware / fleet:
  - `routes/firmwareupdate.route.js`
  - `controllers/fwupdatemanagement.controller.js`
  - `controllers/system.controller.js`
  - `services/system.service.js`
  - `services/github.service.js`
  - `services/greenlightguru.service.js`
  - `services/aws.athena.service.js`
- Device control / publish-back:
  - `services/aws.iot.service.js`
  - `controllers/system.controller.js`
- Sessions / cache / internal messaging:
  - `services/redis.service.js`
  - `apps/manager-app.js`

## Trust boundaries
- manager client -> manager HTTPS API
- automation client -> API HTTPS application
- AWS IoT/SQS -> inbound message processing
- backend service -> MongoDB
- backend service -> Redis
- backend service -> AWS IoT data plane
- backend service -> GitHub / GLG / S3

## Privileged operations
- authorize manager requests: `middleware/authtoken.middleware.js:verify()`
- provision systems/devices: `controllers/api.controller.js:provisionSystem()`
- create user records during auth flow: `services/user.service.js:createUser()`
- mutate user/group authorization state: `controllers/usermanagement.controller.js`, `services/user.service.js`
- publish shell commands to devices: `controllers/system.controller.js:sendShellCommand()`
- generate and publish presigned download URLs: `controllers/system.controller.js:processSystemDataRequest()`
- update device shadow desired state: `controllers/api.controller.js:processSystem()`
- register firmware metadata and change fleet targeting: `controllers/fwupdatemanagement.controller.js`

## Candidate high-risk code paths
1. Manager request -> `reqCookie()` -> `auth.verify()` -> privileged manager controller
2. Inbound SQS message -> `routes/mqtt.route.js:process()` -> `system.controller.js:processSystemGetFile()` -> S3 URL publish-back
3. Manager firmware/fleet change -> `fwupdatemanagement.controller.js:modifyFleet()` -> `system.service.js:setDirtyBitForFleet()` -> `/api/processDirtySystems`
4. Automation call -> `verifyAPIKey()` -> `api.controller.js:processDirtySystems()` -> `aws.iot.service.js:updateShadowPropertyForDevice()`
5. Manager shell command -> `system.controller.js:sendShellCommand()` -> `aws.iot.service.js:publishMessageToDevice()`
