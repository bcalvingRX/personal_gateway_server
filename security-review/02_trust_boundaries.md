# Trust Boundaries

## Boundary 1: Manager client -> manager HTTPS application
What crosses the boundary:
- `useremail` header
- `sessID` cookie
- manager route parameters and request bodies

Why it matters:
- this boundary gates user/group changes, firmware management, fleet changes, system modifications, report operations, and shell command publishing

Trust assumption visible from code:
- `middleware/input.middleware.js:reqCookie()` treats `useremail` plus presence of `sessID` as sufficient input to continue authorization evaluation

What should be validated later:
- whether `useremail` is injected or normalized by trusted upstream infrastructure
- whether direct client control of `useremail` is prevented in deployment

## Boundary 2: Automation client -> API HTTPS application
What crosses the boundary:
- `authorization` API key header
- provisioning payloads
- dirty-system processing trigger

Why it matters:
- provisioning creates new systems/devices
- dirty-system processing updates device-facing AWS IoT shadow state

Trust assumption visible from code:
- a matching MD5-hashed API key in MongoDB is treated as sufficient authorization for these operations

What should be validated later:
- how API keys are generated, stored, rotated, and scoped operationally
- whether these endpoints are network-restricted or otherwise isolated

## Boundary 3: AWS IoT / SQS message plane -> inbound MQTT route dispatcher
What crosses the boundary:
- MQTT-style command payloads with `command`, `gateway`, and command-specific fields
- device-originated metrics
- shell responses
- file/manifest/firmware retrieval requests

Why it matters:
- inbound messages can trigger persistence, Redis fanout, firmware/manifest delivery, and publish-back to devices

Trust assumption visible from code:
- messages that arrive through the SQS subscription and satisfy lightweight validation are processed

What should be validated later:
- AWS IoT topic policies and certificate controls
- whether claimed `gateway` identities are strongly bound upstream

## Boundary 4: Backend service -> MongoDB
What crosses the boundary:
- users, groups, permissions
- systems, devices, fleets, firmware
- state records and metrics

Why it matters:
- MongoDB stores the persistent control state that later influences device behavior

Trust assumption visible from code:
- persisted identifiers and relationships are assumed to be authoritative for later authorization and synchronization decisions

What should be validated later:
- index and schema hardening
- migration/seed procedures for sensitive collections

## Boundary 5: Backend service -> Redis
What crosses the boundary:
- session state
- cached permissions
- S3/SQS processing locks
- shell response pub/sub messages

Why it matters:
- Redis is part of authorization correctness and internal event routing, not just performance caching

Trust assumption visible from code:
- Redis connectivity and key isolation are assumed to be trustworthy for session and cache integrity

What should be validated later:
- deployment security for Redis transport and access controls
- behavior during Redis outage or stale cache conditions

## Boundary 6: Backend service -> AWS IoT data plane
What crosses the boundary:
- shell and file-delivery commands published to devices
- desired shadow updates containing device and fleet hashes

Why it matters:
- this is the outbound control channel to deployed systems

Trust assumption visible from code:
- thing IDs resolved from backend state are the correct recipients for commands and shadow updates

What should be validated later:
- IoT topic authorization and least privilege
- device-side handling of shadow values and command topics

## Boundary 7: Backend service -> external firmware sources and S3 delivery bucket
What crosses the boundary:
- upstream firmware discovery and download requests to GitHub and GLG
- firmware binaries and manifest content written to S3
- presigned URLs returned for device retrieval

Why it matters:
- this path mediates OTA content delivery

Trust assumption visible from code:
- upstream source presence checks are sufficient to register firmware metadata
- downloaded content is trusted without in-repo cryptographic verification

What should be validated later:
- bucket policy, lifecycle, and encryption
- device-side firmware verification
- external source authenticity requirements
