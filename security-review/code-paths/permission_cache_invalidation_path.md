# Permission Cache Invalidation Path

## Plain English Description

This document explains how user permissions are cached and when those cached permissions are refreshed or invalidated.

The gateway server uses **Redis to cache user permissions** in order to avoid repeated database lookups on every authorized request. When a user performs an action that requires authorization, the system attempts to retrieve the user's permissions from Redis first. If the cache is missing or forced to refresh, the system loads permissions from MongoDB and repopulates the cache.

This path is security-relevant because **stale permissions could allow a user to retain access longer than intended after role or group changes**.

---

## Purpose

Trace how permissions are:

- loaded
- cached
- refreshed
- invalidated

and identify whether permission changes propagate safely through the system.

---

## Core Files

Primary logic lives in:

- `services/user.service.js`
- `middleware/authtoken.middleware.js`
- `services/redis.service.js`

---

## Authorization Path (Context)

When a manager route requires authorization, the following flow occurs:

Request  
→ `auth.verify(location, permission)`  
→ `userService.getUserPermissions(email, false)`  
→ Redis cache checked first  
→ fallback to MongoDB if cache miss  
→ permissions evaluated

This means Redis is part of the **authorization decision path**.

---

## Permission Cache Lookup

File: `services/user.service.js`

Function:

`getUserPermissions(user, updateCache)`

Behavior:

1. Attempt to retrieve permissions from Redis cache
2. If cache exists and `updateCache == false`, return cached permissions
3. If cache missing or refresh requested:
   - load user and group from MongoDB
   - derive permissions from group
   - write permissions back to Redis cache

This ensures permission lookup is fast during normal operation.

---

## Cache Refresh Trigger

Observed trigger:

`getUserPermissions(email, true)`

This flag forces the system to **refresh the cache** by reloading permissions from MongoDB.

Example usage:

`controllers/authentication.controller.js`

Function:

`getLoginInfo()`

Behavior:

- retrieves session user
- calls `getUserPermissions(email, true)`

This means **permissions are refreshed when a user logs in**.

---

## Redis Storage

File: `services/redis.service.js`

The Redis service stores permission data keyed by user identifier.

Expected pattern:

- user identifier (email) used as cache key
- permissions stored as serialized list

Exact key format should be confirmed in Redis service implementation.

---

## Permission Change Sources

User permissions may change when:

- user group membership changes
- permissions assigned to a group change
- new users are created
- administrative changes modify authorization rules

The system must ensure cached permissions do not remain stale after these changes.

---

## Observed Cache Behavior

Confirmed behaviors:

- permission cache exists
- cache refresh occurs on login
- Redis stores permission lists

Unconfirmed behaviors:

- whether permission changes trigger cache invalidation
- whether Redis entries have expiration times
- whether admin operations purge affected user caches

These behaviors require deeper inspection.

---

## Security-Relevant Observations

1. Redis permission cache participates directly in authorization decisions.
2. Cached permissions may persist beyond backend changes unless refreshed.
3. Cache refresh is confirmed on login events.
4. It is unclear whether administrative permission changes invalidate cache entries immediately.
5. Redis availability affects both authentication performance and authorization behavior.

---

## Follow-Up Questions

These are not findings yet.

1. Do administrative operations invalidate permission caches for affected users?
2. Are Redis permission entries assigned TTL expiration values?
3. Can a user retain elevated access temporarily if their group membership changes while they are logged in?
4. Are permission cache keys scoped uniquely per environment or deployment?

---

## Next Review Targets

1. `services/user.service.js`
   - inspect permission caching logic in full

2. `services/redis.service.js`
   - inspect cache key naming and TTL configuration

3. `controllers/usermanagement.controller.js`
   - determine whether user/group changes invalidate cache

4. `middleware/authtoken.middleware.js`
   - confirm how cached permissions are used during authorization