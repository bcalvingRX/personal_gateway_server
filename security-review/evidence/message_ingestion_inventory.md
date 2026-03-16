# Message Ingestion Inventory

## Inbound message source
- `services/aws.sqs.service.js`
  - long-polls SQS
  - parses JSON message body
  - dispatches `payload` to MQTT route handler when topic matches gateway operations

## Dispatcher
- `routes/mqtt.route.js`
  - validates base command shape
  - maps known commands to controller handlers
  - active commands:
    - `info`
    - `shell`
    - `data`

## Validation
- `middleware/mqtt-input.middleware.js`
  - `reqMetrics`
  - `reqShellResp`
  - `reqDataResp`

## Downstream handlers
- `controllers/system.controller.js:storeSystemMetrics()`
- `controllers/system.controller.js:processSystemShellResponse()`
- `controllers/system.controller.js:processSystemGetFile()`

## Discovery observations
- inbound message handling is explicit rather than reflection-based
- validation is present but lightweight
- the `data` command path reaches privileged OTA retrieval logic
