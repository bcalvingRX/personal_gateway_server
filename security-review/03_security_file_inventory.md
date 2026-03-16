# Security File Inventory

## Critical priority
- `middleware/authtoken.middleware.js`
  - Why it matters: manager authorization decisions, API-key checks, and unused instrument TLS check live here
  - Security category: auth, authz, identity, privileged operation gating
  - Priority for follow-up review: critical

- `middleware/input.middleware.js`
  - Why it matters: manager/API request validation, identity extraction into `res.locals.data`, and route parameter sanitization
  - Security category: validation, auth input handling, middleware
  - Priority for follow-up review: critical

- `controllers/system.controller.js`
  - Why it matters: publishes shell/file commands to devices, serves OTA URLs, handles inbound metrics/shell/data messages, and mediates privileged system actions
  - Security category: communications, OTA/update flow, privileged operations, persistence
  - Priority for follow-up review: critical

- `services/system.service.js`
  - Why it matters: persistent state transitions for systems/devices/fleets/firmware, dirty-flag handling, manifest generation, and firmware lookup
  - Security category: persistence, update flow, trust-boundary decisions
  - Priority for follow-up review: critical

- `routes/mqtt.route.js`
  - Why it matters: inbound message dispatcher from trusted message plane into controller handlers
  - Security category: communications, message ingestion
  - Priority for follow-up review: critical

- `middleware/mqtt-input.middleware.js`
  - Why it matters: only visible validation layer before inbound MQTT-style messages reach controller handlers
  - Security category: validation, communications
  - Priority for follow-up review: critical

## High priority
- `routes/system.route.js`
  - Why it matters: system management and shell-control HTTP surface
  - Security category: authz, privileged operations, control plane
  - Priority for follow-up review: high

- `routes/firmwareupdate.route.js`
  - Why it matters: firmware/group/fleet write surface that influences OTA targeting
  - Security category: authz, update flow, privileged operations
  - Priority for follow-up review: high

- `routes/usermanagement.route.js`
  - Why it matters: user/group/permission state management routes
  - Security category: authz, identity administration
  - Priority for follow-up review: high

- `controllers/api.controller.js`
  - Why it matters: provisioning and dirty-system processing bridge backend state into device-visible updates
  - Security category: provisioning, control plane, synchronization
  - Priority for follow-up review: high

- `services/user.service.js`
  - Why it matters: user auto-provisioning, permission loading, cache use, and API-key verification
  - Security category: auth, authz, identity state
  - Priority for follow-up review: high

- `services/aws.sqs.service.js`
  - Why it matters: receives and dispatches trusted inbound messages from AWS SQS
  - Security category: external integration, message ingestion
  - Priority for follow-up review: high

- `services/aws.iot.service.js`
  - Why it matters: outbound device command and shadow-update channel
  - Security category: external integration, device control, communications
  - Priority for follow-up review: high

- `services/aws.athena.service.js`
  - Why it matters: S3 object existence checks, uploads, expiration refresh, and presigned URL generation
  - Security category: update flow, storage, privileged operations
  - Priority for follow-up review: high

- `services/github.service.js`
  - Why it matters: GitHub release lookup and binary download for OTA sources
  - Security category: external integration, update flow
  - Priority for follow-up review: high

- `services/greenlightguru.service.js`
  - Why it matters: GLG firmware lookup and download for OTA sources
  - Security category: external integration, update flow
  - Priority for follow-up review: high

- `services/redis.service.js`
  - Why it matters: session store, permission cache, locks, and system-scoped pub/sub
  - Security category: sessions, cache integrity, internal communications
  - Priority for follow-up review: high

## Medium priority
- `apps/manager-app.js`
  - Why it matters: manager app middleware order, session configuration, and route mounting
  - Security category: sessions, middleware, entry point
  - Priority for follow-up review: medium

- `apps/api-app.js`
  - Why it matters: automation app route mounting and rate limiting
  - Security category: entry point, rate limiting
  - Priority for follow-up review: medium

- `model/user.js`, `model/user-group.js`, `model/gateway-permissions.js`
  - Why it matters: permission and identity model backing manager authorization
  - Security category: authz persistence
  - Priority for follow-up review: medium

- `model/w200/device-template.js`, `model/w200/firmware-template.js`, `model/w200/fleet-template.js`, `model/w200/state-record-template.js`, `model/w200/system-metrics-template.js`
  - Why it matters: device identity, OTA metadata, manifest state, and flexible metrics persistence
  - Security category: persistence, update flow, communications
  - Priority for follow-up review: medium

- `index.js`
  - Why it matters: startup assumptions, required secrets, TLS material loading, background receiver initialization
  - Security category: secrets, runtime assumptions, entry point
  - Priority for follow-up review: medium

- `certs/`, `.env`
  - Why it matters: TLS and service-secret handling visible in repository layout
  - Security category: secrets, certificates
  - Priority for follow-up review: medium
