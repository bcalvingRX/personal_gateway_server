# Authorization Surface Consolidation

## Purpose
Consolidate the refreshed discovery observations for manager authorization and authorization-state mutation so focused review can build from a corrected baseline.

## Inputs consolidated
- `security-review/evidence/auth_validation_review.md`
- `security-review/evidence/auth_and_session_inventory.md`
- `security-review/evidence/privileged_operations_inventory.md`
- `security-review/code-paths/manager_auth_permission_path.md`
- `security-review/code-paths/usermanagement_controller_path.md`
- `security-review/code-paths/permission_cache_invalidation_path.md`

## Authorization model summary
Manager authorization is implemented as:

request metadata (`useremail`, `sessID`)
-> route validation
-> `auth.verify(location, permission)`
-> `userService.createUser(email)`
-> `userService.getUserPermissions(email, false)`
-> group-based permission match
-> controller handler

This makes the manager authorization surface depend on:
- trusted identity establishment before `verify()`
- correct route/middleware ordering
- stable user/group/permission state in MongoDB
- correct Redis permission-cache behavior

## Confirmed discovery observations
1. manager auth is group-based and centralized in `auth.verify()` and `userService.getUserPermissions()`
2. manager identity is consumed from validated request data, not directly from a session lookup in the auth middleware
3. user records can be created as a side effect of auth flows
4. the first created user becomes admin when the user store is empty
5. reviewed user/group mutation paths clear permission-cache entries after major state changes
6. some write-capable system/firmware routes use `SYSTEM:view`, making route-permission classification a focused-review priority

## Positive controls carried forward
- explicit route-level permission checks
- controller-driven permission-cache invalidation on reviewed mutation paths
- separation between manager user/group auth and API-key auth

## Open questions to carry into focused review
- whether deployment infrastructure constrains `useremail`
- whether any unreviewed auth-state mutation path bypasses cache invalidation
- whether the current route-to-permission mapping matches intended role separation
