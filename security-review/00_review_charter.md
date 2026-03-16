# Gateway Architecture Overview and Review Charter

## Repository role in the broader system
`walkasins-gateway-server` is a Node.js backend service that sits between manager-facing administrative users, backend automation, AWS IoT/SQS infrastructure, and deployed W-200 gateway/device systems. Based on the repository code, its primary roles are:

- manager-facing control plane for systems, fleets, firmware, reports, and user/group administration
- backend automation/API surface for provisioning systems and processing dirty systems
- synchronization service that converts backend fleet/device state into AWS IoT shadow updates
- inbound message processor for device-originated MQTT-style traffic delivered through AWS SQS
- OTA mediation service that discovers firmware metadata, caches firmware/manifests in S3, and publishes device retrieval URLs

## Component type determination
Determined component type:
- backend service
- cloud support service for gateway/device fleet management

Reasoning:
- two HTTPS Express applications are started from `index.js`
- the code exposes HTTP route groups for manager and automation clients
- state is persisted in MongoDB and Redis rather than device-local storage
- AWS IoT, SQS, and S3 integrations indicate cloud-side control-plane responsibilities
- firmware management, fleet targeting, and device-shadow synchronization are performed server-side

## Major services, modules, and interfaces
- Manager app: `apps/manager-app.js`
- API app: `apps/api-app.js`
- HTTP routes: `routes/*.route.js`
- MQTT/SQS inbound dispatch: `services/aws.sqs.service.js`, `routes/mqtt.route.js`
- Manager/API middleware: `middleware/*.middleware.js`
- Core controllers: `controllers/*.controller.js`
- Persistence and orchestration services: `services/*.service.js`
- Persistent models: `model/` and `model/w200/`

## Major inbound and outbound data flows
- Manager user -> HTTPS manager routes -> auth/validation -> controllers -> MongoDB/Redis/AWS
- Automation client -> HTTPS API routes -> API key validation -> provisioning or dirty-system processing
- AWS SQS message -> MQTT route dispatcher -> system controller handlers -> Redis, MongoDB, S3, or publish-back to AWS IoT
- Manager firmware/fleet changes -> MongoDB state update -> dirty flag set -> `/api/processDirtySystems` -> AWS IoT shadow desired state update
- Device data request -> inbound MQTT `data` command -> firmware/manifest retrieval -> S3 presigned URL -> AWS IoT publish back to requesting thing

## Security-relevant responsibilities
- manager identity and authorization enforcement
- API-key validation for automation endpoints
- user/group/permission state management
- provisioning of new systems and devices
- shell command dispatch to systems
- fleet and firmware metadata management
- device message ingestion and metrics persistence
- firmware manifest generation and OTA file delivery orchestration
- TLS key/certificate loading for HTTPS server startup

## Review method and guardrails
- update existing review artifacts in place
- use repository source code as the source of truth
- keep outputs evidence-oriented and suitable for engineering, security, and audit review
- separate confirmed observations from uncertain concerns requiring manual validation
- avoid speculative vulnerabilities or unsupported production-impact claims

## Unknowns and out-of-scope areas
- ingress/proxy identity handling ahead of the manager app
- AWS IoT topic policies and device certificate policy enforcement
- S3 bucket policy, lifecycle, encryption, and access logging
- device-side firmware verification and install logic
- production database seed state and operational bootstrap procedures

## Static-review caveats
- this workspace reflects source-code review only
- no runtime cloud configuration, hardware behavior, or deployment topology was available for verification
- no application code, dependencies, or project configuration were changed
