# User Service Review

## Plain English Description
This document reviews `services/user.service.js`, which is one of the most security-relevant files in the gateway server.

This service sits behind the manager authentication and authorization model and is responsible for:

- creating user records
- assigning users to groups
- loading permissions
- caching permissions in Redis
- editing user groups and their permissions
- supporting authorization checks used throughout the manager application

This file matters because it is a core trust-enforcement layer for administrator access.

---

## Purpose
Document the security-relevant behaviors implemented in `services/user.service.js` and resolve remaining questions from earlier auth, Redis, and permission-cache review artifacts.

---

## Main File in Scope

- `services/user.service.js`

Related upstream artifacts:
- `evidence/auth_validation_review.md`
- `code-paths/manager_auth_permission_path.md`
- `code-paths/permission_cache_invalidation_path.md`
- `evidence/redis_service_review.md`

Related controller file:
- `controllers/usermanagement.controller.js`

---

## Confirmed Service Roles

The service is responsible for at least these major areas:

1. user auto-provisioning
2. user-to-group assignment
3. permission loading from group membership
4. Redis-backed permission caching
5. user-group creation and editing
6. user-group membership queries
7. API key verification support

This confirms `user.service.js` is the main backend service for manager authorization state.

---

## User Auto-Provisioning

### Function: `createUser(user)`

### Confirmed Behavior
The function:
1. checks whether the user already exists
2. if the user does not exist:
   - counts existing users
   - if this is the first user, assigns `"Admin Group"`
   - otherwise assigns `"Default Group"`
3. creates and saves the user record

### Security-Relevant Meaning
This is a confirmed administrative trust decision implemented in code.

The service automatically provisions a user record during auth-related flows, and the first created user is placed into the admin group.

This is not automatically a finding, but it is a high-value security design point because initial bootstrap behavior determines who receives administrative access first.

---

## Permission Loading

### Function: `getUserPermissions(user, updateCache)`

### Confirmed Behavior
The function:
1. checks Redis for cached permissions unless `updateCache` is true
2. if cache is usable:
   - returns cached permissions
3. otherwise:
   - loads the user record
   - populates the user’s group
   - derives permission list from group membership
   - stores the permissions back in Redis
   - returns the permission list

### Security-Relevant Meaning
This confirms the authorization model is:

user  
→ group  
→ permissions

Redis improves performance, but MongoDB group membership is the source of truth.

This also confirms that authorization decisions depend on:
- correct user-group assignment
- correct group-permission definitions
- correct Redis cache behavior

---

## Permission Cache Integration

### Related Redis Key
From earlier Redis review:
- permission cache keys are stored as `permissions:<user>`
- TTL is 3600 seconds

### Confirmed Behavior in this Service
`getUserPermissions(...)`:
- reads cached permissions first
- rebuilds cache from MongoDB when needed
- writes refreshed permissions back into Redis

### Security-Relevant Meaning
This confirms the service participates directly in both:
- permission evaluation
- permission cache refresh

It does not by itself prove invalidation on admin changes; that was traced separately through controllers.

---

## User Group Assignment

### Function: `setUsersGroup(user, group)`

### Confirmed Behavior
The function:
- finds the specified user
- updates the user’s `group` reference in MongoDB

### Security-Relevant Meaning
This changes effective authorization state.

This service method does not itself clear Redis permission cache. Earlier review confirmed cache invalidation for this path is handled in the controller after the service write succeeds.

This means:
- effective correctness depends on the controller + service pair
- the service alone is not sufficient to keep cache and DB in sync

---

## Group Permission Editing

### Function: `editUserGroup(id, permissions)`

### Confirmed Behavior
The function:
1. validates that the requested permission list has no duplicates
2. loads the target group
3. loads the global permission model
4. determines which permissions should be added or removed
5. applies MongoDB updates to the group’s permission set

### Security-Relevant Meaning
This is the backend write path that changes what a group is allowed to do.

As with user-group assignment:
- the service performs the database update
- controller logic is responsible for clearing affected Redis permission caches afterward

---

## Group Creation and Query Support

### Functions Observed
- `createUserGroup(...)`
- `getUserGroups(...)`
- `getUsersInGroup(...)`
- `getPermissions(...)`
- count/list helper functions

### Security-Relevant Meaning
These functions support the administrative permission model and provide the data used by manager UI workflows.

Of particular importance:
- `getUsersInGroup(id)` is used by controller logic to find which caches must be cleared after group edits

That makes it part of the permission-cache invalidation path.

---

## API Key Verification Support

### Function: `checkForAPIKey(key)`

### Confirmed Behavior
The function:
- hashes the supplied API key using MD5
- checks the API key collection for a match

### Security-Relevant Meaning
This function supports API-key protected routes such as:
- provisioning
- dirty-system processing

This confirms `user.service.js` is not only a manager-auth service; it also supports programmatic API authorization.

---

## Confirmed Security-Relevant Observations

1. `user.service.js` is the main backend authority for user/group/permission state.
2. The authorization model is explicitly group-based.
3. The first created user is automatically assigned to the admin group.
4. User records are auto-created during authentication-related flows.
5. Redis-backed permission caching is integrated directly into permission lookup.
6. Permission-changing service methods do not themselves clear Redis; controller logic handles invalidation.
7. API key verification also lives in this service, making it part of both manager auth and backend API auth.

---

## Positive Controls

- permissions are derived from group membership rather than scattered per-user logic
- permission lookup falls back to MongoDB when cache is missing or refresh is forced
- duplicate permissions are checked during group edit operations
- helper functions exist to target affected users during cache invalidation
- API keys are hashed before lookup rather than compared in plaintext form

---

## Security-Relevant Limitations

### 1. First-user admin bootstrap is a high-trust design choice
Automatically assigning the first created user to the admin group is a security-sensitive bootstrap mechanism.

This may be acceptable by design, but it should be treated as a deliberate trust decision rather than an incidental implementation detail.

### 2. Cache consistency depends on controllers
The service performs permission-changing writes, but cache invalidation happens in controller code.

Implication:
- the reviewed controller paths handle this correctly
- any future service consumer that bypasses controller invalidation could leave stale permission cache entries behind

### 3. API key verification uses MD5 hashing
The reviewed code uses MD5 to hash API keys before lookup.

This is a code-confirmed implementation detail. On its own, this does not establish a finding, but it is weaker than modern password-hashing approaches. Its acceptability depends on how API keys are generated, stored, and protected elsewhere.

---

## Resolved Questions

### How are permissions loaded?
Resolved:
- permissions come from the user’s group record in MongoDB
- Redis is a cache, not the primary source of truth

### Does the service participate directly in permission caching?
Resolved:
- yes, `getUserPermissions(...)` reads and refreshes Redis cache

### Is cache invalidation handled inside the service?
Resolved:
- no, not for the reviewed permission-changing paths
- invalidation is handled by controller logic

### Does the service support API-key-protected routes?
Resolved:
- yes, through `checkForAPIKey(...)`

---

## Remaining Questions

1. Is the first-user admin bootstrap safe in all deployment/bootstrap scenarios?
2. Are there any other permission-changing paths in the repo that use this service without controller-level cache invalidation?
3. How are API keys generated and rotated outside this service?
4. Is MD5 hashing of API keys acceptable in the deployment threat model, or should stronger keyed or modern hash handling be used?

---

## Impact on Earlier Artifacts

### `auth_validation_review.md`
Resolved further:
- user auto-provisioning and group-based permission loading are confirmed core behaviors
- API key verification also resides in this service

### `manager_auth_permission_path.md`
Resolved further:
- the permission source-of-truth is MongoDB group membership
- Redis is the performance layer on top of that

### `permission_cache_invalidation_path.md`
Confirmed:
- permission-changing writes occur in the service
- controller logic is required to keep Redis cache consistent afterward

### `redis_service_review.md`
Confirmed:
- permission cache refresh behavior in this service matches Redis cache patterns already documented

---

## Findings Status

No confirmed finding is recorded from this slice yet.

Strongest review themes remaining:
- first-user admin bootstrap as a deliberate trust decision
- controller/service split for permission cache invalidation
- API key hashing/storage strength

These are evidence-backed design questions, not confirmed findings from this file alone.

---

## Next Review Targets

1. `controllers/usermanagement.controller.js`
   - confirm all permission-changing routes perform cache invalidation consistently

2. `routes/usermanagement.route.js`
   - confirm write-route authorization levels match the sensitivity of group and permission changes

3. `model/user.js`
   - confirm schema assumptions about user identity and group references

4. `model/user-group.js`
   - confirm schema assumptions about stored group/permission relationships