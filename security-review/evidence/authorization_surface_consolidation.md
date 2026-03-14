# Authorization Surface Consolidation

## Plain English Description
This document consolidates the authorization-related review work completed across the gateway server.

Earlier artifacts reviewed the authorization system from multiple angles:

- route protection
- controller behavior
- service-layer permission loading
- Redis permission caching
- user schema
- user-group schema

This file brings those pieces together so the authorization model can be understood as one system rather than as separate files.

This is useful because authorization weaknesses often appear in the gaps between layers, not only inside one file.

---

## Purpose
Summarize the manager authorization surface of the gateway server, capture what is confirmed from code, identify the strongest positive controls, and determine whether any code-supported finding exists at this stage.

---

## Artifacts Consolidated

This document consolidates conclusions from:

- `evidence/auth_validation_review.md`
- `code-paths/manager_auth_permission_path.md`
- `evidence/redis_service_review.md`
- `code-paths/permission_cache_invalidation_path.md`
- `evidence/user_service_review.md`
- `code-paths/usermanagement_controller_path.md`
- `evidence/user_model_review.md`
- `evidence/user_group_model_review.md`
- `evidence/usermanagement_route_review.md`

---

## Authorization Model Summary

The reviewed manager authorization model is:

authenticated manager identity  
→ user record lookup / auto-provisioning  
→ user assigned to one group  
→ group contains effective permissions  
→ permissions loaded from MongoDB or Redis cache  
→ route/controller access decision made by `auth.verify(location, permission)`

This is a layered, group-based authorization model.

---

## Confirmed Authorization Layers

### 1. Session and identity layer
Manager routes require:
- session/cookie validation
- identity carried through validated request state

Reviewed artifacts showed:
- `reqCookie()` validates session cookie and user identity fields
- `getLoginInfo()` uses `req.session.user`
- permission evaluation later depends on `res.locals.data.useremail`

Security meaning:
- authorization depends on both session state and correct middleware ordering

---

### 2. Route permission layer
User-management and system-management routes are protected using:
- `auth.verify(location, permission)`

Reviewed route/controller artifacts showed:
- read operations use view-style permissions
- write operations use stronger permissions such as APPLY, ADD, EDIT, DELETE, and CONTROL where applicable

Security meaning:
- the route layer generally matches operation sensitivity
- reviewed write paths are not exposed under read-only permissions in the user-management surface

---

### 3. Controller enforcement layer
Controllers perform:
- service writes
- cache invalidation
- operation-specific guard logic

Reviewed controllers showed:
- changing a user’s group explicitly clears that user’s permission cache
- editing a group’s permissions clears caches for affected users
- deleting a group is blocked when users remain assigned

Security meaning:
- controller logic reinforces authorization-state consistency after service writes

---

### 4. Service-layer authorization state
`services/user.service.js` implements:
- user auto-provisioning
- user-to-group assignment
- group permission editing
- permission loading
- API key verification support

Security meaning:
- the service is the main backend authority for manager auth state
- permission decisions are based on group membership, not scattered per-user logic

---

### 5. Redis cache layer
Redis stores:
- manager session state
- permission cache entries
- internal async events

Reviewed Redis behavior showed:
- permission cache keys use user identity
- cache TTL is 1 hour
- reviewed controller paths explicitly invalidate affected permission caches after major auth changes

Security meaning:
- Redis is in the authorization path
- cache consistency is important, but major reviewed permission-changing paths do not rely only on TTL expiry

---

### 6. Schema layer
Reviewed schema assumptions showed:
- user records anchor identity and group linkage
- group records anchor stored permission relationships

Security meaning:
- the auth model depends on stable schema relationships:
  - one logical user identity
  - one group assignment
  - resolvable group permission relationships

---

## Strongest Positive Controls

1. Authorization is group-based and layered rather than ad hoc.
2. Route-level permissions distinguish read and write operations.
3. Controller paths explicitly invalidate Redis permission cache after major reviewed auth changes.
4. Group deletion is blocked when users remain assigned.
5. Permission lookup falls back to MongoDB when cache is missing or forced to refresh.
6. Redis permission cache is finite-lived rather than permanent.
7. Reviewed user-management write routes are protected by stronger permissions than read routes.

---

## Confirmed Security-Relevant Design Decisions

### 1. First-user admin bootstrap
The first created user is automatically assigned to the admin group.

This is code-confirmed and should be treated as an intentional bootstrap trust decision.

### 2. Auto-provisioned user records
Users are created automatically as part of auth-related flows if they do not already exist.

This is a real behavior, not just an admin-only provisioning workflow.

### 3. Cache invalidation is controller-enforced
The major reviewed permission-changing paths rely on controller logic to keep Redis cache in sync after service writes.

### 4. API key verification shares the user service
`user.service.js` is part of both:
- manager authorization support
- backend API-key verification support

---

## Confirmed Limitations and Residual Risks

### 1. Bootstrap trust remains security-sensitive
The first-user-admin behavior could be acceptable by design, but it is still a high-trust initialization choice.

### 2. Controller/service split is a maintenance risk
The reviewed paths clear permission cache correctly, but the service does not enforce that on its own. Future write paths that bypass the controllers could create stale-cache issues.

### 3. Authorization still depends on identity-source trust
Earlier review showed that `auth.verify(...)` depends on validated identity fields reaching `res.locals.data`. This depends on route/middleware ordering and trusted identity derivation.

### 4. API key hashing strength remains a design question
The reviewed implementation hashes API keys with MD5 before lookup. This is a code-confirmed implementation detail that may warrant later design review depending on broader key-management context.

---

## Resolved Questions

### Are permission-changing routes protected more strongly than read routes?
Resolved:
- yes, for the reviewed user-management surface

### Are major permission changes followed by explicit cache invalidation?
Resolved:
- yes, for reviewed user-group assignment and group-permission edit paths

### Is authorization based on group membership?
Resolved:
- yes, this is the central authorization model

### Is Redis only a cache and not part of auth correctness?
Resolved:
- no, Redis is part of auth correctness, but reviewed controller paths actively maintain cache consistency

---

## Remaining Questions

These are not findings yet.

1. Is the first-user admin bootstrap safe in all deployment/bootstrap scenarios?
2. Are there any permission-changing paths elsewhere in the repo that bypass the reviewed controller invalidation logic?
3. Are the identity and group schema constraints strong enough to fully enforce the assumptions made by the service layer?
4. Is MD5-based API key hashing acceptable in the actual deployment threat model?
5. Are there any admin/bootstrap tools outside normal routes/controllers that modify user/group state?

---

## Findings Status

No confirmed authorization finding is recorded at this stage.

Current state:
- the reviewed authorization surface appears structured and intentionally layered
- major permission-changing paths reviewed so far behave more safely than a TTL-only or route-only model
- several security-sensitive design choices remain open for architectural judgment or broader-scope review

This means the appropriate conclusion is:

No confirmed code-supported authorization flaw has been established in the reviewed scope so far, but important design and deployment questions remain.

---

## Recommended Next Steps

1. Review any remaining admin/bootstrap paths outside normal manager routes
2. Review schema/index definitions if not already confirmed
3. Decide whether the first-user admin bootstrap should be recorded as:
   - accepted design
   - operational risk
   - or formal finding
4. Move to broader architecture consolidation:
   - critical security surfaces summary
5. Prepare for Codex phase using the completed artifact set