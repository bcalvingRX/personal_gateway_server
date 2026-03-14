# System Control Follow-Up Path

## Plain English Description

This document reviews the remaining **system-level control functions** exposed by the gateway server after the main command paths have already been analyzed.

Earlier artifacts covered:

- shell command execution
- inbound device messaging
- firmware management
- dirty system processing

However, the gateway also contains **additional system-level routes and service functions** that can influence device behavior or backend state. These functions often appear as supporting or follow-up operations related to system control.

The goal of this artifact is to trace those remaining control-adjacent paths and confirm how authorization, validation, and backend services are used.

---

## Purpose

Identify additional system management behaviors exposed through:

- `routes/system.route.js`
- `controllers/system.controller.js`
- `services/system.service.js`

and determine how they interact with earlier security-sensitive paths.

---

## Primary Route File

`routes/system.route.js`

All routes in this file are mounted under:

`/api/system`

These routes provide operational access to system information and control behavior.

---

## Observed Routes

Confirmed endpoints include:

GET routes:

- `/api/system`
- `/api/system/count`

POST routes:

- `/api/system/shellCommand`
- `/api/system/observeShell`

The shell command path was already analyzed in the artifact:

`system_shell_command_path.md`

This artifact focuses on the **supporting system-management operations**.

---

## Common Middleware Pattern

Most system routes follow the same security structure:

1. `reqCookie()`  
2. `auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW or CONTROL)`  
3. route-specific validation  
4. controller handler

This confirms that system management operations require:

- session authentication
- permission evaluation

---

## Controller Behavior

File:

`controllers/system.controller.js`

This controller contains logic for:

- system data retrieval
- shell command operations
- inbound system responses
- system observation streaming

Some of these functions were covered in earlier artifacts.

Relevant functions include:

- `sendShellCommand()`
- `observeShell()`
- `processSystemShellResponse()`
- `storeSystemMetrics()`

This confirms the controller acts as a **central hub for system command and response behavior**.

---

## System Observation Path

Function:

`observeShell()`

Purpose:

Allows the manager interface to observe shell command responses through a streaming mechanism.

Observed behavior:

- reads `system` identifier from request headers
- opens an SSE (Server-Sent Events) stream
- subscribes to Redis events for that system
- forwards shell responses to the connected client

Security relevance:

- relies on Redis event bus
- must correctly scope responses by system identifier
- must enforce authorization before opening observation channel

---

## Relationship to Redis Event Bus

From earlier artifacts:

`internal_event_bus.md`

Shell responses follow this path:

device response  
→ inbound message processing  
→ `processSystemShellResponse()`  
→ Redis publish  
→ `observeShell()` subscriber stream

This confirms that Redis and SSE streaming are used together to deliver real-time system output.

---

## System Service Role

File:

`services/system.service.js`

This service manages:

- firmware records
- groups
- fleets
- systems
- dirty flag behavior
- database persistence

Many controller operations delegate to this service.

Security relevance:

- backend state changes ultimately propagate through this service
- database writes and system updates originate here

A deeper review of this service will follow.

---

## Confirmed Security-Relevant Observations

1. System routes require both session authentication and permission checks.
2. Shell command operations use a dedicated control permission.
3. Redis is used to transport shell responses to observers.
4. SSE streaming exposes system command output to connected clients.
5. The system controller is a central hub for both inbound and outbound system control logic.

---

## Follow-Up Questions

These are not findings yet.

1. Does `observeShell()` enforce permission checks before opening the SSE stream?
2. Are Redis channels isolated by system identifier?
3. Can a user subscribe to another system's shell responses?
4. Are system identifiers validated before being used to subscribe to Redis channels?
5. Are limits enforced on SSE connection duration or concurrency?

---

## Next Review Targets

1. `services/system.service.js`
   - deep inspection of backend state logic

2. `services/redis.service.js`
   - confirm Redis channel naming and isolation

3. `middleware/mqtt-input.middleware.js`
   - confirm inbound validation before system responses enter Redis

4. `controllers/system.controller.js`
   - confirm SSE streaming protections