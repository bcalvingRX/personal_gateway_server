# Redis Service Review

## Plain English Description
This document reviews how the gateway server uses Redis in practice.

The code confirms that Redis is used for three different purposes:

1. session storage for the manager application
2. permission and application data caching
3. internal publish/subscribe event delivery for system-specific events such as shell responses

This makes Redis part of both the authentication path and the internal event bus.

---

## Purpose
Document the security-relevant Redis patterns used by the gateway server and identify what is confirmed from code versus what still needs deeper tracing.

---

## Main File in Scope

- `services/redis.service.js`

Related files already reviewed:
- `services/user.service.js`
- `controllers/system.controller.js`
- `apps/manager-app.js`

---

## Confirmed Redis Clients

The service creates three Redis clients:

- `redisClient`
- `sessionClient`
- `redisSubscriber`

Plain-English meaning:
- one client is used for general Redis operations such as keys and publishing
- one client is used for session storage
- one client is used for subscription handling

All three connect to:

`redis://rxfunction-gw-redis:6379`

Authentication:
- password is read from the file path in `process.env.REDIS_PASS`
- file contents are trimmed and used as the Redis password

Security-relevant observation:
- Redis authentication is present
- the connection string is plain `redis://`, not `rediss://`
- no TLS settings are visible in this service

---

## Confirmed Redis Roles

### 1. Session Storage
`getSessionClient()` returns the dedicated `sessionClient`.

Previously reviewed manager app code confirms this client is used by `connect-redis` for session storage.

This means Redis is directly in the manager authentication/session path.

### 2. Key/Value Cache
The service exposes:
- `getKey(type, key)`
- `setKey(type, key, data)`
- `clearKey(type, key)`

This is used for cached application state such as permissions.

### 3. Pub/Sub Event Bus
The service exposes:
- `subToSystem(type, system, client)`
- `unsubFromSystem(type, system, clientId)`
- `pubToSystem(type, system, message)`

This is used for system-specific async event delivery.

### 4. Distributed Locks
The service exposes:
- `acquireS3Lock()`
- `releaseS3Lock()`
- `acquireSQSLock()`
- `releaseSQSLock()`

These use short-lived Redis keys to coordinate access.

---

## Confirmed Redis Key Types

The code defines these key families in `REDIS_KEYS`:

### Cached keys with TTL or persistence
- `WALKASINS_GLG_FW`
  - key prefix: `walkasins_glgfw`
  - duration: `-1`
  - meaning: persists until explicitly cleared

- `SYSTEM_METRIC_UP_FLAG`
  - key prefix: `system_metric_up`
  - duration: `3600` seconds

- `PERMISSIONS`
  - key prefix: `permissions`
  - duration: `3600` seconds

- `SYSTEM_FILE_DL_URL`
  - key prefix: `gwFileDownload`
  - duration: `1209600` seconds
  - about 2 weeks

### Pub/Sub channel prefixes
- `SYSTEM_UPDATES`
  - prefix: `updates-`

- `SYSTEM_SHELL_RESPONSES`
  - prefix: `shell-`

Plain-English meaning:
- permission cache entries do have a TTL
- shell-response and update channels are system-scoped by string prefix plus system identifier

---

## Confirmed Permission Cache Behavior

Redis permission cache keys are stored using:

`permissions:<user>`

TTL:
- 3600 seconds
- about 1 hour

This answers one earlier open question:
- permission caches are not permanent
- they expire automatically after one hour

What is still not confirmed here:
- whether permission caches are explicitly cleared immediately after group/user changes

That requires tracing the write paths in `user.service.js` and related controllers.

---

## Confirmed Pub/Sub Channel Design

System-scoped pub/sub channels are constructed as:

`<type.name><system>`

Examples from configured prefixes:
- `shell-<system>`
- `updates-<system>`

This answers an earlier open question:
- shell/event channels are not global by default
- they are partitioned by the supplied `system` identifier

### Subscription behavior
`subToSystem(type, system, client)`:
- creates a subscriber callback for that exact channel if one does not already exist
- stores subscriber clients in `systemSubscriptions[channel]`
- on message receipt, writes Server-Sent Events data to each subscribed client response

### Unsubscription behavior
`unsubFromSystem(type, system, clientId)`:
- removes the client from the in-memory subscriber list
- unsubscribes the Redis subscriber from the channel when no clients remain

### Publish behavior
`pubToSystem(type, system, message)`:
- publishes directly to `<type.name><system>`

Plain-English meaning:
- Redis channels are partitioned by system identifier
- multiple connected clients can observe the same system-specific stream
- SSE streaming is coupled to Redis channel delivery

---

## Confirmed Distributed Lock Behavior

Two lock keys are used:

- `s3_lock`
- `sqs_lock`

Both are acquired with:
- `NX: true`
- `EX: 10`

Plain-English meaning:
- the service uses Redis as a simple distributed lock
- locks expire after 10 seconds
- this likely protects overlapping work on S3 or SQS-related tasks

Security relevance:
- this is operational coordination, not authorization
- short lock TTL means long-running work could outlive the lock if not carefully designed elsewhere

---

## Confirmed Security-Relevant Observations

1. Redis is part of the manager session path.
2. Redis is part of authorization support through permission caching.
3. Permission cache entries expire after one hour.
4. Redis pub/sub channels are partitioned by system identifier using prefixes like `shell-<system>`.
5. Shell-response delivery is implemented as Redis pub/sub feeding SSE clients.
6. Redis also provides short-lived distributed locks for S3 and SQS coordination.
7. Redis authentication is used, but no TLS configuration is visible in this file.

---

## Positive Controls

- separate Redis clients are used for session, subscriber, and general operations
- permission cache entries have finite TTL
- pub/sub channels are scoped by system identifier rather than one shared global channel
- subscriptions are cleaned up when the last client unsubscribes
- distributed locks use atomic `NX` plus expiration

---

## Remaining Questions

1. Are permission cache entries explicitly cleared after user/group modifications, or does the system rely only on TTL expiry?
2. Is the `system` value used in pub/sub channel naming always validated and trusted before it reaches Redis functions?
3. Are there any sensitive event types besides shell responses and updates that use Redis channels elsewhere in the repo?
4. Does the lack of TLS on the Redis connection match the deployment trust model, or is transport security provided elsewhere?
5. Are the 10-second S3/SQS locks long enough for the work they protect?

---

## Impact on Earlier Artifacts

### `manager_auth_permission_path.md`
Resolved:
- permission cache entries do have TTL
- TTL is 1 hour

Still open:
- explicit invalidation on permission changes

### `system_shell_command_path.md`
Resolved:
- shell responses are routed internally using system-scoped Redis channels

### `inbound_handler_processing_path.md`
Resolved:
- Redis channels are partitioned by system identifier
- Redis is the actual handoff for shell-response SSE delivery

### `internal_event_bus.md`
Resolved:
- exact key families and channel prefixes are now known
- Redis is confirmed to be both cache and event bus

---

## Next Review Targets

1. `services/user.service.js`
   - confirm whether permission cache is explicitly cleared after user/group changes

2. `controllers/usermanagement.controller.js`
   - trace user/group update paths that could require cache invalidation

3. `controllers/system.controller.js`
   - confirm which additional event flows publish into Redis besides shell responses