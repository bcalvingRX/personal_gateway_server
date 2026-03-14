# User Management Controller Path

## Plain English Description
This document traces how manager-side user and group administration requests are processed by the gateway server.

This slice focuses on the controller layer for operations that can change effective authorization state, including:

- changing a user’s assigned group
- creating user groups
- editing group permissions
- deleting user groups

This path matters because these operations directly influence who can do what in the manager application.

---

## Purpose
Trace permission-changing manager requests through:

- route validation
- authorization checks
- controller handlers
- service-layer writes
- Redis permission-cache invalidation

and determine whether authorization state changes are applied safely and consistently.

---

## Main Files in Scope

- `routes/usermanagement.route.js`
- `controllers/usermanagement.controller.js`

Related upstream artifacts:
- `evidence/user_service_review.md`
- `code-paths/permission_cache_invalidation_path.md`
- `evidence/redis_service_review.md`
- `evidence/auth_validation_review.md`

Related downstream service:
- `services/user.service.js`

---

## High-Level Path

Manager request  
→ route validator  
→ `auth.verify(...)` permission check  
→ `usermanagement.controller.js` handler  
→ `user.service.js` write operation  
→ Redis permission cache clear for affected users  
→ later auth checks rebuild cache from MongoDB

---

## Route Protection Model

**File:** `routes/usermanagement.route.js`

The reviewed user-management routes use:

1. `reqCookie()`
2. `auth.verify(...)`
3. route-specific validator
4. controller handler

This confirms that user/group administration is behind:
- session/cookie validation
- permission checks
- route-specific input validation

---

## Route Groups and Sensitivity

### Read-oriented routes
Examples:
- get users
- get user count
- get permissions
- get user groups
- get user-group count

These use view-style permissions such as:
- `auth.LOC.USR` with `auth.PERM.VIEW`
- `auth.LOC.USR_GRP` with `auth.PERM.VIEW`

### Write-oriented routes
Examples:
- `POST /api/users/editUser`
- `POST /api/users/createUserGroup`
- `POST /api/users/editUserGroup`
- `DELETE /api/users/userGroup`

These use stronger permissions such as:
- `auth.PERM.APPLY`
- `auth.PERM.ADD`
- `auth.PERM.EDIT`
- `auth.PERM.DELETE`

This is a positive control because write operations are permissioned more strongly than read operations.

---

## Controller: Change User Group

### Function: `setUserGroup(req, res, next)`

### Confirmed Behavior
The controller:
1. reads validated values from `res.locals.data`
2. calls `userService.setUsersGroup(name, groupId)`
3. if the write succeeds, clears the user’s Redis permission cache using:
   - `redisService.clearKey(redisService.REDIS_KEYS.PERMISSIONS, res.locals.data.name)`
4. returns success

### Security-Relevant Meaning
This is a strong control:
- effective permission changes are not left to Redis TTL expiry alone
- the affected user’s cached permissions are explicitly invalidated

This closes one of the major earlier auth/cache questions for this path.

---

## Controller: Create User Group

### Function: `createUserGroup(req, res, next)`

### Confirmed Behavior
The controller:
1. reads validated input from `res.locals.data`
2. calls `userService.createUserGroup(...)`
3. returns success or error

### Security-Relevant Meaning
This creates new authorization structures but does not itself require cache invalidation for existing users, because no users are yet assigned to the new group by this action alone.

---

## Controller: Edit User Group

### Function: `editUserGroup(req, res, next)`

### Confirmed Behavior
The controller:
1. calls `userService.editUserGroup(id, permissions)`
2. loads all users currently in that group using:
   - `userService.getUsersInGroup(id)`
3. loops through those users
4. clears each affected user’s Redis permission cache using:
   - `redisService.clearKey(redisService.REDIS_KEYS.PERMISSIONS, userInGroup.user)`
5. returns success

### Security-Relevant Meaning
This is one of the most important positive controls in the authorization model.

When group permissions change, the controller explicitly invalidates cached permissions for all affected users. This prevents the system from relying only on the one-hour TTL for updated authorization state.

---

## Controller: Delete User Group

### Function: `deleteUserGroup(req, res, next)`

### Confirmed Behavior
The controller:
1. gets users currently assigned to the target group
2. if the group is not empty:
   - throws an error (`User group not empty`)
3. only deletes the group if no users are assigned

### Security-Relevant Meaning
This is a positive control because it prevents deletion of a group that still has members. That reduces one class of authorization-state inconsistency and avoids the need to invalidate caches for users whose group would otherwise disappear underneath them.

---

## Controller: Read Operations

### Functions observed
- `getUsers(...)`
- `getNumberUsers(...)`
- `getPermissions(...)`
- `getUserGroups(...)`
- `getNumberUserGroups(...)`

### Security-Relevant Meaning
These handlers appear to expose authorization and user/group state to the manager interface but do not themselves change authorization state.

Their importance is mainly:
- visibility into current permission structures
- support for administrative workflows

---

## Confirmed Security-Relevant Observations

1. Permission-changing user-management routes are protected by stronger permissions than read-only routes.
2. Changing a user’s group explicitly invalidates that user’s Redis permission cache.
3. Editing a group’s permissions explicitly invalidates caches for all affected users in that group.
4. Group deletion is blocked when users are still assigned.
5. The controller layer is where cache consistency is enforced after service-layer writes.

---

## Positive Controls

- route-level auth and validation are present for user-management operations
- write operations use stronger permissions than read operations
- cache invalidation is explicit for the reviewed permission-changing paths
- group deletion is blocked when membership still exists
- controller behavior aligns with the intended authorization model documented in earlier artifacts

---

## Security-Relevant Limitations

### 1. Cache invalidation depends on controller usage
The service layer does not clear Redis on its own for these writes. Correctness depends on all effective permission-changing operations going through controller paths that perform invalidation.

### 2. Controller/service split is an ongoing maintenance risk
The current reviewed routes handle invalidation correctly, but future code paths that call the same service methods without the matching controller invalidation could introduce stale-cache behavior.

### 3. Read exposure still deserves least-privilege review
Although not a finding from this slice, read routes expose user/group/permission information and should still be checked for appropriate audience and data minimization.

---

## Resolved Questions

### Are permission-changing routes protected more strongly than read routes?
Resolved:
- yes, reviewed write routes use stronger permissions such as APPLY, ADD, EDIT, and DELETE

### Does changing a user’s group clear the user’s permission cache?
Resolved:
- yes, the controller explicitly clears the affected user’s cache

### Does editing group permissions clear caches for affected users?
Resolved:
- yes, the controller clears cache entries for each user returned by `getUsersInGroup(id)`

### Can a group be deleted while users are still assigned?
Resolved:
- no, the controller blocks deletion when the group is not empty

---

## Remaining Questions

1. Are there any other permission-changing paths elsewhere in the repo that bypass these controllers?
2. Are model-level constraints on users and groups strong enough to support these controller assumptions?
3. Do any admin/bootstrap scripts modify user/group state without matching cache invalidation?
4. Are the route-level validators for user/group operations strict enough for all permission-related fields?

---

## Impact on Earlier Artifacts

### `permission_cache_invalidation_path.md`
Resolved further:
- controller-level invalidation is confirmed for the major reviewed permission-changing paths

### `user_service_review.md`
Confirmed:
- the service performs the writes
- the controller provides the cache-consistency enforcement afterward

### `auth_validation_review.md`
Updated understanding:
- the manager authorization model is supported by both strong route permissions and explicit cache invalidation on reviewed write paths

### `redis_service_review.md`
Updated understanding:
- Redis permission-cache invalidation is operationally used in real admin write paths, not just available as helper functionality

---

## Findings Status

No confirmed finding is recorded from this slice yet.

This slice strengthens confidence in the reviewed authorization-change paths because the controller behavior appears consistent with the intended security model.

---

## Next Review Targets

1. `routes/usermanagement.route.js`
   - confirm route-level validators and permission mappings line up with controller sensitivity

2. `model/user.js`
   - confirm schema assumptions about user identity and group references

3. `model/user-group.js`
   - confirm schema assumptions about stored group and permission relationships

4. any admin/bootstrap paths outside normal controllers
   - check for user/group writes that bypass controller-level cache invalidation