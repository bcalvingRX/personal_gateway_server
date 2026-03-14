# Inbound Controller Handlers

## Plain English Description

This document reviews the inbound controller handlers that process device or backend messages after they pass through the MQTT validation layer.

Earlier artifacts confirmed that inbound messages can trigger three main handlers:

- `storeSystemMetrics(...)`
- `processSystemShellResponse(...)`
- `processSystemGetFile(...)`

This artifact closes the loop on the inbound control plane by documenting what those handlers actually do and what remains unresolved.

---

## Purpose

Trace the behavior of inbound controller handlers and determine:

- what data they accept
- what backend state they modify
- whether they rely on validated input only
- whether sensitive data handling occurs

---

## Main File in Scope

- `controllers/system.controller.js`

Related artifacts:

- `code-paths/inbound_messaging_control_plane.md`
- `code-paths/inbound_handler_processing_path.md`
- `evidence/mqtt_input_validation_review.md`

---

## Handler: `storeSystemMetrics(...)`

### Role

Processes inbound `info` messages from systems.

Upstream validation confirms the handler receives:
- gateway identifier
- `record` object

### Confirmed Behavior

The handler:
1. logs the gateway ID and inbound record
2. loads the system using:
   - `systemService.getSystemByGateway(gatewayID)`
3. if no system is found:
   - logs a warning
   - returns without writing metrics
4. if a system is found:
   - writes metrics using `systemService.storeSystemMetrics(system.system_name, record)`

### Security-Relevant Meaning

This is better than blindly trusting the inbound gateway identifier because the controller:
- resolves the gateway to a known system
- does not proceed if the gateway is unknown

However:
- the `record` object is only lightly validated upstream as a non-array object
- no deeper schema enforcement is visible in this slice

---

## Handler: `processSystemShellResponse(...)`

### Role

Handles shell command responses sent back by systems.

### Confirmed Behavior

The handler:
1. logs the system/gateway identifier
2. logs the response message
3. publishes the response into Redis using:
   - `redisService.pubToSystem(redisService.REDIS_KEYS.SYSTEM_SHELL_RESPONSES, thingID, JSON.stringify({ message }))`

### Security-Relevant Meaning

This confirms:
- shell output is not stored directly in this handler
- shell output is forwarded into the internal Redis event bus
- the message is wrapped as JSON with a `message` field before publish

This matches earlier Redis findings that shell-response channels are system-scoped.

---

## Handler: `processSystemGetFile(...)`

### Role

Processes inbound file/data responses from systems.

Upstream validation confirms the handler receives:
- gateway/system identifier
- file
- type
- offset

### Confirmed Behavior

The handler:
1. logs the inbound parameters
2. branches on `type`

#### For `type === "fw"`
- loads system by gateway using `systemService.getSystemByGateway(thingID)`
- if no system exists, logs warning and returns
- if system exists, gets firmware manifest using:
  - `systemService.getFirmwareManifest(system._id)`
- publishes the manifest into Redis using:
  - `redisService.pubToSystem(redisService.REDIS_KEYS.SYSTEM_UPDATES, thingID, JSON.stringify({ type, file, data: manifest }))`

#### For `type === "fw_man"`
- loads a download URL using:
  - `redisService.getKey(redisService.REDIS_KEYS.SYSTEM_FILE_DL_URL, file)`
- publishes that URL into Redis using:
  - `redisService.pubToSystem(redisService.REDIS_KEYS.SYSTEM_UPDATES, thingID, JSON.stringify({ type, file, data: url }))`

#### For `type === "rand"`
- publishes a placeholder payload into Redis using:
  - `data: "not implemented yet"`

### Security-Relevant Meaning

This confirms:
- the handler does not directly write returned file content to disk in this slice
- instead, it translates certain inbound requests into Redis-published update data
- for firmware manifest requests, the handler resolves the system through `getSystemByGateway(...)` before generating manifest data
- for `fw_man`, the handler reads a cached URL from Redis and forwards it
- `rand` path is present but not implemented

---

## Confirmed Identity Binding Pattern

A meaningful positive control is visible in this slice:

Both `storeSystemMetrics(...)` and the `fw` branch of `processSystemGetFile(...)` call:

- `systemService.getSystemByGateway(gatewayID or thingID)`

This means inbound messages are not acted on solely by trusting the claimed gateway string. The controller attempts to map that identifier to a known system before doing system-specific work.

This does not fully prove transport-level authenticity, but it is stronger than direct blind use of the identifier.

---

## Confirmed Observations

1. Inbound controller handlers do perform real backend actions.
2. Metrics ingestion resolves the gateway to a known system before storing metrics.
3. Shell response handling forwards output into Redis, not directly into persistent storage in this handler.
4. File/data handling mainly translates requests into Redis-published update data.
5. Firmware manifest generation is tied to system lookup through gateway identity.
6. The `fw_man` path depends on Redis-cached download URL state.
7. The `rand` path is stubbed and not implemented.

---

## Positive Controls

- system lookup by gateway ID occurs before important backend actions in reviewed handlers
- unknown gateways are logged and ignored in reviewed system-bound paths
- shell responses are routed into system-scoped Redis channels
- file/data handling uses enumerated message `type` values from upstream validation
- inbound handlers are narrower than full raw-message processing

---

## Security-Relevant Limitations

### 1. Metrics record schema is still broad
`record` is validated upstream only as a non-array object.
No deeper schema enforcement is visible in this slice.

### 2. `fw_man` path trusts Redis-cached URL state
The handler forwards a URL from Redis cache without additional validation here.

### 3. Redis is a major dependency in inbound processing
Shell responses and update data both rely on Redis for onward delivery.

### 4. `rand` path exists as a partially implemented route
It currently returns `"not implemented yet"` through Redis publishing.

---

## Resolved Questions

### Does `storeSystemMetrics(...)` use only validated input?
Resolved partially:
- it receives validated arguments from the MQTT validation layer
- but the `record` object itself is only lightly validated as a general object

### What does `processSystemGetFile(...)` do with returned data?
Resolved:
- it does not directly store arbitrary inbound file contents in this reviewed slice
- it builds or retrieves backend data and publishes it into Redis update channels

### Is system identity used blindly?
Resolved partially:
- reviewed handlers often resolve gateway ID to system state before acting
- this is a positive control
- transport/authenticity of the claimed gateway remains an upstream trust question

---

## Remaining Questions

1. What exact schema does `systemService.storeSystemMetrics(...)` expect and enforce?
2. How is `SYSTEM_FILE_DL_URL` populated, and who is allowed to set it?
3. Is Redis-published update data consumed only by the correct intended subscriber?
4. Does `getSystemByGateway(...)` guarantee one-to-one safe binding in all cases?
5. Are there any other inbound handlers outside this controller that process device-originated data?

---

## Findings Status

No confirmed finding is recorded from this slice yet.

Most plausible future candidate areas:
- overly broad metrics-record acceptance
- trust model around Redis-cached firmware download URLs
- any upstream weakness in gateway identity authenticity

These remain review questions, not findings, based on code seen so far.

---

## Next Review Targets

1. `services/system.service.js`
   - review:
     - `storeSystemMetrics(...)`
     - `getSystemByGateway(...)`
     - `getFirmwareManifest(...)`

2. `services/redis.service.js`
   - follow URL-cache path for `SYSTEM_FILE_DL_URL`

3. any code path that writes `SYSTEM_FILE_DL_URL`
   - determine who controls firmware download URL cache entries
