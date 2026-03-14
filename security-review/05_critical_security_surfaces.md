# Critical Security Surfaces

## Plain English Description
This document collapses the gateway-server review into the main security surfaces that matter most from an attacker and defender perspective.

The goal is to simplify the architecture into a small number of meaningful review areas. Each surface represents a place where trust decisions are made, security controls are applied, or backend state can influence device behavior.

This summary is useful for:
- threat modeling
- communicating the review to other engineers
- planning dynamic validation
- preparing for a later Codex-assisted review phase

---

## Purpose
Summarize the gateway server into the core security surfaces identified during the manual review.

---

## Surface 1: Manager Authentication and Authorization

### What it includes
- session/cookie validation
- user identity handling
- group-based permission model
- route-level authorization
- permission cache behavior

### Main files
- `middleware/authtoken.middleware.js`
- `middleware/input.middleware.js`
- `controllers/authentication.controller.js`
- `controllers/usermanagement.controller.js`
- `services/user.service.js`
- `services/redis.service.js`
- `model/user.js`
- `model/user-group.js`

### Why it matters
This surface controls who can access manager functionality and what actions they are allowed to perform.

### Main review conclusions
- authorization is group-based and layered
- reviewed permission-changing paths explicitly invalidate Redis permission cache
- first-user admin bootstrap is a high-trust design decision
- no confirmed code-supported auth flaw was established in reviewed scope

---

## Surface 2: Manager Control Plane

### What it includes
- system management routes
- shell command send path
- shell observation path
- operational control handlers

### Main files
- `routes/system.route.js`
- `controllers/system.controller.js`
- `services/aws.iot.service.js`
- `services/redis.service.js`

### Why it matters
This surface allows privileged users to issue commands to deployed systems and observe responses.

### Main review conclusions
- shell command path is a real remote-control path
- command send uses validated request data and strong route permissions
- shell observation path is less structured and reads raw header input
- no confirmed finding recorded yet, but this remains a high-sensitivity area

---

## Surface 3: Firmware and Fleet Management

### What it includes
- firmware metadata creation
- group and fleet management
- firmware-to-group assignment
- backend state changes that later affect deployed systems

### Main files
- `routes/firmwareupdate.route.js`
- `controllers/fwupdatemanagement.controller.js`
- `services/system.service.js`
- `model/w200/firmware-template.js`
- `model/w200/fleet-template.js`
- `model/w200/group-template.js`

### Why it matters
This surface controls what firmware and configuration state may later propagate to systems.

### Main review conclusions
- firmware-management routes change backend state rather than directly publishing to devices
- fleet modification marks systems dirty for later processing
- reviewed write routes appeared to use `SYSTEM + VIEW`, which remained a design question for later judgment
- this is an indirect but high-impact device-control surface

---

## Surface 4: Dirty System Processing and Synchronization

### What it includes
- dirty-flag handling
- batch processing of changed systems
- state-hash generation
- AWS IoT shadow update flow

### Main files
- `routes/api.route.js`
- `controllers/api.controller.js`
- `services/system.service.js`
- `services/aws.iot.service.js`

### Why it matters
This surface turns backend configuration state into device-facing synchronization signals.

### Main review conclusions
- newly provisioned systems start dirty
- dirty systems are processed in batches
- deterministic state hashes are generated and pushed to device shadow desired state
- this is the bridge between administrative state changes and device-visible update behavior

---

## Surface 5: Inbound Device Messaging Control Plane

### What it includes
- inbound MQTT-style message handling
- message validation
- message dispatch
- metrics ingestion
- shell response handling
- file/data response handling

### Main files
- `routes/mqtt.route.js`
- `middleware/mqtt-input.middleware.js`
- `controllers/system.controller.js`
- `services/system.service.js`

### Why it matters
This is the reverse direction of the device control plane: messages from devices or backend messaging infrastructure coming back into the gateway.

### Main review conclusions
- inbound commands are explicitly enumerated
- basic message validation exists before dispatch
- controller handlers perform real backend actions
- gateway-to-system identity is often resolved through `getSystemByGateway(...)`
- validation depth for some inbound content remained an open design question

---

## Surface 6: Internal Event Bus and State Support Services

### What it includes
- Redis session storage
- Redis permission caching
- Redis pub/sub channels
- SSE delivery of shell responses
- short-lived distributed locks
- supporting internal event propagation

### Main files
- `services/redis.service.js`
- `services/user.service.js`
- `controllers/system.controller.js`
- `apps/manager-app.js`

### Why it matters
This surface ties together authentication, asynchronous messaging, and live operational output.

### Main review conclusions
- Redis is not only a cache; it is also an internal event bus
- shell response channels are system-scoped
- permission cache entries have finite TTL and reviewed write paths explicitly invalidate affected entries
- lack of visible TLS on Redis connection remained a deployment-context question, not a code finding

---

## Summary of Reviewed Security Surfaces

The gateway server primarily operates as:

1. a manager-authenticated administrative control plane
2. a backend synchronization engine
3. a device messaging processor
4. a firmware/fleet state manager
5. an internal event-routing node

These are the main security surfaces that should be carried into:
- threat modeling
- Codex-assisted repo mapping
- dynamic validation planning
- broader system-level review across other devices and services

---

## Review Outcome at This Stage

The reviewed gateway-server scope produced:
- strong architecture understanding
- clear trust boundaries
- documented high-risk code paths
- no confirmed code-supported findings yet in the reviewed scope
- several design and deployment questions suitable for runtime, cloud, or device-side validation

This is best described as:
- manual security review baseline complete for the gateway server
- not a full end-to-end security audit of the overall system