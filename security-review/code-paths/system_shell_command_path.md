# System Shell Command Path

## Plain English Description
This document explains how a manager user sends a shell command to a system through the gateway server.

A request enters the manager API, passes identity and permission checks, and then the server publishes a command message to AWS IoT. The device subscribed to that topic receives the command.

This path is security-sensitive because it allows remote control of connected systems.

---

## Route Entry
File: `routes/system.route.js`

Endpoint:
`POST /api/system/shellCommand`

Middleware chain:
1. `reqCookie()`
2. `auth.verify(SYSTEM, CONTROL)`
3. `reqSystemShellCommand()`
4. `systemController.sendShellCommand`

---

## Validation

File: `middleware/input.middleware.js`

`reqCookie()` requires:
- `useremail` header
- `sessID` cookie

`reqSystemShellCommand()` validates:
- `system` (string)
- `command` (string)
- `retain` (boolean)

Validated values are copied into:
`res.locals.data`

---

## Authorization

File: `middleware/authtoken.middleware.js`

`auth.verify(SYSTEM, CONTROL)`

Behavior:
- reads `useremail` from `res.locals.data`
- loads permissions from `userService`
- verifies `SYSTEM + CONTROL` permission

---

## Controller Behavior

File: `controllers/system.controller.js`

Function: `sendShellCommand()`

The controller:
- reads `system`, `command`, and `retain` from `res.locals.data`
- builds a shell command message object
- publishes the command using `awsIOTService.publishMessageToDevice()`
- returns a success response

---

## External Boundary

File: `services/aws.iot.service.js`

Function: `publishMessageToDevice(device, serviceLevel, message, retain)`

Behavior:
- constructs AWS IoT topic using the system/device identifier
- converts the message to JSON
- publishes the message with QoS 1
- uses the caller-provided `retain` flag

Confirmed message flow:

manager user  
→ gateway server  
→ AWS IoT publish  
→ downstream device/system subscriber

---

## Response Path

File: `controllers/system.controller.js`

Function: `processSystemShellResponse()`

Behavior:
- receives shell response message
- publishes the response to Redis using `redisService.pubToSystem()`

This indicates the shell feature has a command channel and a response channel.

---

## Related Observation Path

Route:
`POST /api/system/observeShell`

Files:
- `routes/system.route.js`
- `controllers/system.controller.js`

Observed behavior:
- requires `reqCookie()`
- requires `auth.verify(SYSTEM, CONTROL)`
- reads `system` from `req.header("system")`
- opens an SSE response stream
- does not appear to use a dedicated validator

---

## Positive Controls

- shell command route requires `SYSTEM + CONTROL` permission
- validated values from `res.locals.data` are used
- command publishing is centralized in the AWS IoT service
- shell routes exist only on the manager application

---

## Security-Relevant Observations

1. This is a confirmed remote control path.
2. Authorization requires `SYSTEM + CONTROL` permission.
3. Payload validation occurs before controller execution.
4. `observeShell()` reads raw header input instead of validated input.
5. `retain` is user-controlled and forwarded to AWS IoT.

---

## Follow-Up Questions

These are not findings yet.

1. What does the downstream device do when receiving a shell command?
2. Is the `system` field guaranteed to map only to authorized devices/systems?
3. Are there server-side restrictions on allowed shell commands?
4. Is caller-controlled `retain` safe for shell messages?
5. Should `observeShell()` use dedicated validation instead of raw headers?

---

## Next Review Targets

1. `services/system.service.js`
2. `controllers/system.controller.js`
3. `services/redis.service.js`
4. `downstream device-side command handling`