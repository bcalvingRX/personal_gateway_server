# Internal Event Bus

## Plain English Description

This document explains how the gateway server moves internal events between components after external inputs have been processed.

The gateway does not rely only on synchronous request/response flows. Instead, it uses internal messaging mechanisms to propagate events such as:

- shell command responses
- system updates
- metrics ingestion
- operational notifications

From code inspection, **Redis is used as the primary internal event bus**. In addition to caching permissions, Redis is also used to publish and distribute events between internal components.

This path is important because once data enters the event bus it may be consumed by other parts of the system that are not directly visible in the original request path.

---

## Purpose

Trace how Redis is used for internal messaging and how controller handlers publish events that other system components can consume.

---

## Core File

`services/redis.service.js`

This service encapsulates Redis connectivity and exposes helper functions used by controllers and services.

Redis is used for two main purposes in the gateway:

1. Permission caching
2. Internal event propagation

This artifact focuses on the **event propagation role**.

---

## Event Publishing Example: Shell Responses

File:

`controllers/system.controller.js`

Function:

`processSystemShellResponse(thingID, message)`

Observed behavior:

- receives shell response message from inbound messaging pipeline
- calls:

`redisService.pubToSystem(thingID, message)`

Meaning:

Shell responses from devices are **published into Redis channels**, allowing other parts of the system to observe or stream results.

---

## Redis Event Publishing

File:

`services/redis.service.js`

Function:

`pubToSystem(system, message)`

Plain-English role:

- constructs a Redis channel based on the system identifier
- publishes the provided message to that channel

Expected consumer model:

- subscribers listen to system-specific channels
- manager or monitoring interfaces receive updates asynchronously

This matches the earlier shell command flow:

manager sends command  
→ device executes command  
→ device sends response  
→ gateway receives response  
→ Redis publishes event  
→ observer receives output

---

## Other Redis Usage

Redis is also used for permission caching.

Relevant function:

`getPermissionsCache(user)`

This is part of the **authorization path**, not the event bus.

However, the dual use of Redis means it serves as both:

- cache infrastructure
- asynchronous messaging infrastructure

Security implication: Redis availability and integrity are critical for both auth and messaging.

---

## Event Flow Example

Shell command flow reconstructed across artifacts:

Manager request  
→ controller publishes command to AWS IoT  
→ device executes command  
→ device publishes response  
→ inbound MQTT message received  
→ controller handler processes message  
→ response published into Redis  
→ subscriber receives event

This confirms Redis is a core internal coordination component.

---

## Security-Relevant Observations

1. Redis is used as an **internal event bus**, not only a cache.
2. Controller logic publishes device responses directly into Redis channels.
3. Redis channel naming appears to depend on system identity.
4. Consumers of Redis events are not visible in this repository slice.
5. Event isolation between systems depends on channel naming and subscriber discipline.

---

## Follow-Up Questions

These are not findings yet.

1. How are Redis channels structured?  
   Example: `system:<thingID>` or similar pattern.

2. Are Redis channels authenticated or protected in any way?

3. What components subscribe to these Redis channels?

4. Can one system's event be delivered to another system's subscriber?

5. What protections exist against large or malformed messages entering Redis?

---

## Next Review Targets

1. `services/redis.service.js`
   - full review of publish/subscribe behavior
   - review channel naming scheme

2. `controllers/system.controller.js`
   - confirm all Redis publishing paths

3. `services/user.service.js`
   - verify Redis permission cache usage and expiration

4. `middleware/mqtt-input.middleware.js`
   - confirm inbound message validation before Redis publication