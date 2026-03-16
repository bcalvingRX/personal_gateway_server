# Architecture Notes
Repository: `walkasins-gateway-server`

## Component type and reasoning
Determined type:
- backend service
- cloud support service for gateway/device fleet control

Code-backed reasoning:
- `index.js` starts two HTTPS Express apps and a background SQS polling loop
- `apps/manager-app.js` exposes manager/admin route groups
- `apps/api-app.js` exposes API-key-protected automation routes
- AWS IoT, AWS SQS, AWS S3, Redis, and MongoDB integrations are server-side infrastructure dependencies
- firmware, fleet, and device synchronization logic is centralized in services/controllers rather than embedded code

## Entry points and major layers
### Startup and background processing
- `index.js`
  - loads environment and TLS materials
  - connects MongoDB and Redis
  - initializes AWS SQS, IoT, and S3 helpers
  - starts SQS receiver and both HTTPS apps

### HTTP entry points
- manager app: `apps/manager-app.js`
  - `/api/auth`
  - `/api/users`
  - `/api/report`
  - `/api/system`
  - `/api/fw`
- automation/API app: `apps/api-app.js`
  - `/api/provisionSystem`
  - `/api/processDirtySystems`

### Inbound message entry point
- `services/aws.sqs.service.js:startSQSReceiver()`
- `routes/mqtt.route.js:process()`
  - command map for `info`, `shell`, and `data`

### Major layers
- route layer: request dispatch and middleware composition
- validation/auth layer: `middleware/input.middleware.js`, `middleware/authtoken.middleware.js`, `middleware/mqtt-input.middleware.js`
- controller layer: request-specific orchestration
- service layer: persistence, external integrations, state hashing, caching, and publish-back behavior
- model layer: MongoDB collections for users, permissions, systems, devices, fleets, firmware, and state records

## Key dependencies and integrations
### Data stores
- MongoDB via Mongoose for persistent business state
- Redis for session storage, permission caching, coarse-grained locks, and pub/sub

### Cloud and external services
- AWS IoT data plane for shadows and device publish-back
- AWS SQS for inbound message consumption
- AWS S3 for firmware/manifest caching and presigned URL delivery
- GitHub API for release asset discovery and download
- Greenlight Guru API for firmware revision lookup and download
- Simbase API for SIM detail lookup

## Notable runtime and deployment assumptions visible from code
- HTTPS server key and certificate are loaded from `KEY_FILE` and `CERT_FILE`
- required environment variables are checked in `index.js`
- manager routes depend on `useremail` header plus `sessID` cookie through `reqCookie()`
- automation routes depend on API-key header validation
- device inbound messages are assumed to arrive through trusted AWS IoT -> SQS integration
- firmware file delivery relies on a shared S3 bucket named by `GW_FILES_BUCKET`
- session state is stored in Redis using `connect-redis`

## Security-relevant architectural observations
- the service combines classic web admin functions with device-control and OTA orchestration
- `services/user.service.js` is central to both manager authorization state and API-key lookup
- `services/system.service.js` is the main state transition layer for fleets, firmware, systems, and device synchronization
- `controllers/system.controller.js` contains several high-value privileged operations:
  - shell command publishing
  - presigned URL generation and device delivery
  - inbound metrics persistence
  - manifest and firmware retrieval mediation
- `controllers/api.controller.js` bridges backend state changes into AWS IoT shadow updates through dirty-system processing

## Corrected assumptions from earlier workspace content
- no `passport` or `passport-azure-ad` usage was identified in the current repository code
- current manager authorization flow is header/cookie driven in backend code, not directly tied to an in-repo Azure AD middleware layer
- `services/aws.athena.service.js` is acting as an S3 helper for cached file delivery rather than an Athena query engine in the reviewed paths
