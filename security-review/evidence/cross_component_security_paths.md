# Cross-Component Security Paths

## Path 1: Manager user -> backend service -> AWS IoT -> deployed system
Overall system path:
- manager/admin client sends command or configuration change
- backend authorizes and persists or publishes
- AWS IoT carries command/shadow update to the gateway thing
- deployed system reacts

Portion visible in this repository:
- manager routes, middleware, controllers, service-layer state changes, and AWS IoT publish/shadow calls

Portions outside this repository:
- frontend login/session establishment
- ingress/proxy identity controls
- AWS IoT topic policy
- device-side command/shadow handling

Security assumptions about other components:
- upstream identity establishment is trustworthy
- AWS IoT only delivers to intended thing identities
- device logic safely consumes commands and shadow state

## Path 2: Backend automation -> API app -> provisioning/state sync -> device-facing shadow
Overall system path:
- automation client calls API app
- API key is validated
- backend provisions systems/devices or processes dirty systems
- AWS IoT desired shadow is updated

Portion visible in this repository:
- API routes, API-key verification, provisioning logic, dirty-system processing, shadow update calls

Portions outside this repository:
- API key lifecycle and caller identity
- operational controls around automation clients
- device-side polling/processing of shadow changes

Security assumptions about other components:
- automation callers with valid API keys are authorized for these operations
- shadow updates are consumed only by the correct thing/device

## Path 3: Firmware registration -> fleet targeting -> dirty processing -> manifest/file delivery -> device retrieval
Overall system path:
- manager registers firmware metadata and edits fleet targeting
- backend marks systems dirty
- dirty-system processing computes fleet/device hashes and updates AWS IoT shadow
- device requests manifest or firmware
- backend fetches/caches file in S3 and returns presigned URL via AWS IoT
- device downloads and installs content

Portion visible in this repository:
- firmware metadata registration
- fleet/group mapping changes
- dirty-system processing
- manifest lookup
- external source fetch
- S3 caching and presigned URL delivery

Portions outside this repository:
- firmware release process
- bucket policy
- device-side verification and install logic
- rollback handling outside backend-visible state

Security assumptions about other components:
- external firmware sources are trustworthy
- device-side OTA client validates what it downloads if required
- S3 controls appropriately protect cached artifacts

## Path 4: Device message -> AWS IoT/SQS -> backend ingestion -> Redis/backend state
Overall system path:
- device publishes MQTT-style message
- AWS IoT/SQS delivers message to backend
- backend validates/routs message
- backend updates metrics, forwards shell response, or serves file request

Portion visible in this repository:
- SQS receiver, MQTT dispatcher, validation middleware, controller handlers, Redis publish, metrics persistence, file-delivery logic

Portions outside this repository:
- AWS IoT authentication and topic policies
- device firmware generating the messages
- downstream observers of Redis or metrics data

Security assumptions about other components:
- only intended devices can publish trusted messages
- claimed gateway identity is authentic
- downstream consumers correctly handle forwarded data
