# MQTT Input Validation Review

## Plain English Description
This document reviews how the gateway server validates inbound MQTT-style messages before they are dispatched to controller logic.

The code confirms that inbound message handling uses a small validation layer built on `validatorjs`. The middleware first checks that the message contains a recognized routing shape, then applies command-specific field checks before calling the target controller handler.

This is a positive control, but the validation is relatively lightweight. It mainly enforces required fields and basic types.

---

## Purpose
Document the security-relevant behavior of `middleware/mqtt-input.middleware.js` and clarify what protection exists before inbound messages are dispatched to controller handlers.

---

## Main File in Scope

- `middleware/mqtt-input.middleware.js`

Related files:
- `routes/mqtt.route.js`
- `controllers/system.controller.js`

---

## Confirmed Validation Design

The middleware exports:

- `getCommand(data, error)`
- `valInput(id, data, rules, error)`

It also defines rule sets for specific inbound message types:

- `reqMetrics`
- `reqShellResp`
- `reqDataResp`
- `reqRespondAction`

In the reviewed route file, the active inbound dispatch path uses:

- `info` → `reqMetrics`
- `shell` → `reqShellResp`
- `data` → `reqDataResp`

`reqRespondAction` exists in the middleware but was not seen in the reviewed `routes/mqtt.route.js` dispatch map.

---

## Step 1: Base Message Routing Validation

### `getCommand(data, error)`

Before command-specific validation, the middleware validates the base routing shape using these required fields:

- `command` = required string
- `gateway` = required string

If validation passes, the middleware returns:

- `command: data.command`
- `id: data.gateway`

Plain-English meaning:
- every routed inbound message must provide a command name and a gateway identifier
- the gateway field becomes the first argument passed to downstream handlers

This is the main identity field seen in the inbound route layer.

---

## Step 2: Command-Specific Validation

### `valInput(id, data, rules, error)`

For the selected command type, the middleware:
1. validates the message against the selected rule set
2. builds an argument array starting with the validated gateway ID
3. appends each validated field from the rule set in rule-order
4. passes those arguments to the destination controller handler

Plain-English meaning:
- controller handlers are not called with the full raw message object
- they receive a reduced argument list made from the gateway ID plus rule-defined fields

This is a positive control because it narrows what reaches the handler.

---

## Confirmed Rule Sets

### Metrics messages: `reqMetrics`
Required field:
- `record` = required, valid JSON object

Custom validator:
- `valid_json`
- must be a non-null object
- cannot be an array

Plain-English meaning:
- `info` messages must include an object-valued `record`

### Shell response messages: `reqShellResp`
Required field:
- `message` = required string

Plain-English meaning:
- `shell` messages only require a string payload called `message`

### Data response messages: `reqDataResp`
Required fields:
- `file` = required string
- `type` = required string, one of:
  - `fw`
  - `fw_man`
  - `rand`
- `offset` = required valid number string

Custom validator:
- `valid_number_string`
- must be a non-empty string
- must parse numerically

Plain-English meaning:
- `data` messages are constrained more tightly than shell responses
- file/data responses must declare a file name, a small enumerated type, and a numeric offset represented as a string

### Unused in reviewed route file: `reqRespondAction`
Required fields:
- `actionID` = required string
- `results` = required array
- `path` = required string
- `pathArgs` = required string

This rule set exists but was not observed in the active reviewed dispatch map.

---

## Confirmed Route Integration

**File:** `routes/mqtt.route.js`

The route dispatch logic does the following:

1. validates `command` and `gateway` with `getCommand(...)`
2. looks up the command in a fixed `Map`
3. if the command exists, validates the message with `valInput(...)`
4. only then calls the mapped controller handler

Supported commands in the reviewed map:

- `info`
- `shell`
- `data`

Unknown commands:
- are not dispatched
- produce an error log entry

Plain-English meaning:
- inbound commands are explicitly enumerated
- unknown command values do not fall through into generic controller execution

---

## Confirmed Security-Relevant Observations

1. Inbound command types are explicitly enumerated in `routes/mqtt.route.js`.
2. All reviewed inbound commands must provide both `command` and `gateway`.
3. The gateway identifier is passed into downstream handlers as the first argument.
4. Metrics messages require an object-valued `record`.
5. Shell response messages require only a string `message`.
6. Data-return messages are more constrained and include an enumerated `type`.
7. Unknown commands are rejected from dispatch, but only by logging rather than a stronger enforcement mechanism.

---

## Positive Controls

- known commands are explicitly mapped
- base routing fields are validated before dispatch
- command-specific validation happens before handler execution
- controller handlers receive reduced validated arguments instead of the whole raw message
- `data` message type uses an allowlist for `type`

---

## Validation Limitations Observed

### 1. Validation is mostly type-and-presence based
The rule sets mainly check:
- required presence
- basic type
- small enum constraint for `type`

There is no stronger constraint visible here for:
- string length
- allowed character set
- object schema depth/content
- payload size

### 2. Gateway identity is only checked as a required string
The middleware confirms that `gateway` exists and is a string, but does not itself verify:
- that the gateway corresponds to a known system
- that the gateway is trusted
- that the sender is authorized to claim that gateway identity

This trust may be enforced elsewhere by upstream infrastructure, but it is not enforced in this middleware.

### 3. Shell response validation is minimal
For `shell` messages, only:
- `message` = required string

is enforced.

There is no visible limit here on:
- message size
- content shape
- encoding
- structured response format

### 4. Metrics record validation is broad
For `info` messages, `record` only has to be:
- a non-null object
- not an array

The middleware does not enforce a deeper schema here.

---

## Resolved Questions

### Are inbound message types explicitly enumerated?
Resolved:
- yes, the reviewed route map explicitly supports only `info`, `shell`, and `data`

### Are required fields enforced for each supported message type?
Resolved:
- yes, required fields are defined and validated for each supported command type

### Do handlers receive the full raw message?
Resolved:
- no, the route passes a reduced argument list built from validated fields

---

## Remaining Questions

1. Do the downstream handlers perform deeper semantic validation beyond these basic checks?
2. Is gateway identity strongly bound by upstream AWS infrastructure, or can claimed gateway IDs be spoofed before this stage?
3. Are there size limits elsewhere for shell responses or returned file/data payloads?
4. Is `reqRespondAction` used anywhere else in the repo as part of another inbound path?
5. Does `storeSystemMetrics(...)` validate the shape of `record` more deeply before writing backend state?

---

## Impact on Earlier Artifacts

### `inbound_messaging_control_plane.md`
Resolved:
- supported inbound commands are explicitly enumerated
- command-specific required fields exist

### `inbound_handler_processing_path.md`
Updated understanding:
- handlers receive validated argument subsets, not the raw entire message object
- however validation depth is still limited for some message types

### `system_control_followup_path.md`
Updated understanding:
- inbound validation is present and real
- but gateway identity and payload semantics are not strongly enforced at this layer

---

## Next Review Targets

1. `controllers/system.controller.js`
   - deeper review of:
     - `storeSystemMetrics(...)`
     - `processSystemGetFile(...)`

2. repo-wide search for `reqRespondAction`
   - determine whether that validator protects another inbound path

3. any upstream AWS SQS / IoT ingestion path
   - determine whether gateway identity is strongly bound before middleware validation
