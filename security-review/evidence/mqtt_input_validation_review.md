# MQTT Input Validation Review

## Scope
- `middleware/mqtt-input.middleware.js`
- `routes/mqtt.route.js`
- downstream handler entry points in `controllers/system.controller.js`

## Confirmed validation design
### Base routing validation
- `getCommand(data, error)` requires:
  - `command` as string
  - `gateway` as string
- the returned `gateway` value becomes the first handler argument

### Command-specific validation
- `info` -> `reqMetrics`
  - requires `record` to be a non-null object and not an array
- `shell` -> `reqShellResp`
  - requires `message` string
- `data` -> `reqDataResp`
  - requires `file` string
  - requires `type` in `fw`, `fw_man`, `rand`
  - requires `offset` as numeric string

### Dispatch behavior
- `routes/mqtt.route.js` uses a fixed command map
- unknown commands are logged and not dispatched
- handlers receive reduced validated arguments rather than the full raw message object

## Positive controls
- explicit command allowlist
- validation before handler dispatch
- narrow `type` allowlist for `data` requests

## Validation limitations visible in code
- gateway identity is only validated as a string, not bound to a known system here
- metrics `record` schema is broad
- shell response validation is minimal
- no deeper entitlement check is visible in the validation layer for file or manifest retrieval

## Discovery conclusions
- validation is real but lightweight
- identity and entitlement enforcement for inbound traffic likely depends on downstream logic and/or AWS-side controls
- the `data` message path is the most security-sensitive inbound command because it reaches OTA retrieval logic
