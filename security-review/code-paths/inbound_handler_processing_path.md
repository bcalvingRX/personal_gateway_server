# Inbound Handler Processing Path

## Plain English Description
This document explains what the gateway server does after an inbound device or backend message has already entered the messaging control plane.

The previous artifact showed how inbound messages are received, validated, and dispatched. This artifact goes one step deeper and traces the handlers that actually process those messages.

The important point is that inbound messages do not stop at routing. They trigger backend behavior such as:
- storing system metrics
- forwarding shell responses into Redis
- handling returned file/data content

This path matters because it is where inbound messages become real state changes or operator-visible outputs.

---

## Purpose
Trace the controller-side processing reached from inbound message dispatch and identify how Redis and backend state are used after dispatch.

---

## Main Files in Scope

- `controllers/system.controller.js`
- `services/redis.service.js`

Related upstream artifact:
- `code-paths/inbound_messaging_control_plane.md`

Related upstream dispatch points:
- `routes/mqtt.route.js`
- `middleware/mqtt-input.middleware.js`

---

## High-Level Flow

Inbound message received  
→ message type identified  
→ controller handler called  
→ backend state updated or event forwarded  
→ Redis/internal consumers may receive follow-on event

---

## Inbound Handler: System Metrics

**File:** `controllers/system.controller.js`

**Function:** `storeSystemMetrics(...)`

Plain-English role:
This handler processes inbound system/device information messages and stores or updates backend state based on what the system reports.

Security relevance:
- accepts device-originated operational information
- may affect monitoring, analytics, or device state in the backend
- incorrect validation or trust assumptions here could allow false status or poisoned metrics

Review focus:
- what fields are accepted
- whether the handler uses validated input only
- whether the target system/device identity is trusted and correctly bound

Current status:
- confirmed reachable from inbound `info` dispatch
- deeper field-level review still needed

---

## Inbound Handler: Shell Response

**File:** `controllers/system.controller.js`

**Function:** `processSystemShellResponse(thingID, message)`

Confirmed behavior:
- receives shell response message from inbound messaging path
- publishes that response into Redis using `redisService.pubToSystem(...)`

Plain-English meaning:
The gateway server does not appear to keep shell responses only inside the HTTP request path. Instead, it forwards them into Redis so that another part of the system can observe or stream the result.

This fits the earlier shell-command path:
manager sends shell command  
→ device replies  
→ gateway receives shell response  
→ Redis carries response internally

Security relevance:
- shell output may contain sensitive system information
- Redis channel scoping matters
- system identity binding matters so one system’s output is not confused with another’s

---

## Inbound Handler: Returned File / Data Content

**File:** `controllers/system.controller.js`

**Function:** `processSystemGetFile(...)`

Plain-English role:
This handler processes inbound file/data responses coming back from a system.

Confirmed status:
- reachable from inbound `data` dispatch
- likely part of a get-file or remote retrieval workflow

Security relevance:
- file/data return paths are often high-risk because they may:
  - carry sensitive content
  - affect storage
  - affect operator-visible output
  - create parsing or injection risks if content is not constrained

Current status:
- confirmed as a reachable inbound handler
- deeper content-handling review still needed

---

## Redis Event Bus Role

**File:** `services/redis.service.js`

Plain-English role:
Redis is used as an internal event bus to move responses and asynchronous events around the gateway.

Confirmed role from reviewed paths:
- permission caching already uses Redis in the auth path
- shell response flow publishes into Redis
- other async gateway flows may also use Redis channels for distribution or observation

Why this matters:
Redis is not just a cache in this repo. It is also part of the messaging/control architecture.

Security relevance:
- channel naming and system scoping matter
- subscriber behavior matters
- event separation matters so one system’s data is not delivered to the wrong observer

---

## Relationship to Earlier Artifacts

### `manager_auth_permission_path.md`
Redis participates in permission caching.

### `system_shell_command_path.md`
Redis participates in shell-response return flow.

### `inbound_messaging_control_plane.md`
Inbound device/backend messages may continue through Redis after dispatch.

### `inbound_handler_processing_path.md`
Redis is a confirmed internal handoff point for shell responses and possibly other async event flows.

---

## Confirmed Security-Relevant Observations

1. Inbound messages reach real controller logic, not just logging or passive storage.
2. Shell response handling forwards data into Redis, making Redis part of the security boundary.
3. The inbound path includes file/data response handling, which is potentially sensitive.
4. Metrics ingestion is part of the same inbound control plane and should be treated as a trusted-data boundary.

---

## Follow-Up Questions

These are not findings yet.

1. Does `storeSystemMetrics(...)` use only validated/sanitized input?
2. What exact data is placed into Redis by `processSystemShellResponse(...)`?
3. How are Redis channels keyed or partitioned by system identity?
4. What does `processSystemGetFile(...)` do with returned file/data content after receipt?
5. Are there size limits, content restrictions, or parsing safeguards on inbound file/data payloads?
6. Can one system spoof another system’s identity at this stage of processing, or is identity already strongly bound upstream?

---

## Next Review Targets

1. `services/redis.service.js`
   - review channel naming, publish/subscribe behavior, and system scoping

2. `controllers/system.controller.js`
   - deeper review of:
     - `storeSystemMetrics(...)`
     - `processSystemShellResponse(...)`
     - `processSystemGetFile(...)`

3. `middleware/mqtt-input.middleware.js`
   - confirm exact per-message validation and identity-binding assumptions