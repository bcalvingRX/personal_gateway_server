# Authorization and Access-Control Review

## Scope reviewed
- manager-route authorization enforcement
- user/group permission state handling
- representative privileged routes across user, system, and firmware management surfaces
- automation API-key authorization only as contrast to the manager model

## Discovery inputs used
- `security-review/04_gateway_architecture_overview.md`
- `security-review/05_critical_security_surfaces.md`
- `security-review/evidence/auth_validation_review.md`
- `security-review/evidence/auth_and_session_inventory.md`
- `security-review/evidence/authorization_surface_consolidation.md`
- `security-review/evidence/privileged_operations_inventory.md`
- `security-review/code-paths/manager_auth_permission_path.md`
- `security-review/code-paths/usermanagement_controller_path.md`
- `security-review/code-paths/permission_cache_invalidation_path.md`

## Files/functions examined
- `apps/manager-app.js`
- `middleware/input.middleware.js`
- `middleware/authtoken.middleware.js`
- `services/user.service.js`
- `routes/authentication.route.js`
- `routes/usermanagement.route.js`
- `routes/system.route.js`
- `routes/firmwareupdate.route.js`
- `routes/api.route.js`
- `controllers/authentication.controller.js`
- `controllers/usermanagement.controller.js`
- `controllers/system.controller.js`
- `controllers/fwupdatemanagement.controller.js`

## Traced code paths
- login info path:
  - `/api/auth/getLoginInfo` -> `reqCookie()` -> `auth.verify(Login, Login)` -> `getLoginInfo()` -> `getUserPermissions()`
- user-group mutation path:
  - `/api/users/editUser` -> `reqCookie()` -> `auth.verify(UserGroups, apply)` -> `setUserGroup()` -> permission-cache invalidation
- system control path:
  - `/api/system/shellCommand` -> `reqCookie()` -> `auth.verify(Systems, control)` -> `sendShellCommand()` -> AWS IoT publish
- write-capable system path:
  - `/api/system/setFleet` and `/api/system/modify` -> `auth.verify(Systems, view)` -> mutating controllers
- write-capable firmware path:
  - `/api/fw/firmware`, `/api/fw/group`, `/api/fw/fleet`, `/api/fw/modify` -> `auth.verify(Systems, view)` -> mutating controllers/services

## Confirmed findings
1. Manager authentication is not bound to a verified server-side session in the reviewed backend authorization path.
   - Evidence:
     - `reqCookie()` accepts `useremail` header and `sessID` cookie presence.
     - `auth.verify()` reads `res.locals.data.useremail` and does not verify `req.session.user`.
   - Security property affected:
     - trusted identity establishment at the manager trust boundary.
2. First-user bootstrap grants administrative access based on empty-database state.
   - Evidence:
     - `auth.verify()` always calls `userService.createUser(email)`.
     - `createUser()` assigns `Admin Group` when no users exist.
   - Security property affected:
     - controlled initialization of privileged identities.
3. Several write-capable system and firmware routes are protected only by `SYSTEM:view`.
   - Evidence:
     - `routes/system.route.js` uses `SYSTEM:view` on `/setFleet` and `/modify`.
     - `routes/firmwareupdate.route.js` uses `SYSTEM:view` on firmware/group/fleet creation and fleet modification.
   - Security property affected:
     - consistent authorization of privileged operations.

## Uncertain concerns requiring manual validation
- whether upstream identity infrastructure makes the header-derived manager identity trustworthy in production
- whether current deployed permissions are intended to allow `SYSTEM:view` holders to perform the observed writes
- whether any out-of-band bootstrap or seed process narrows exposure of the runtime first-user-admin behavior

## Limitations
- permission documents and live role assignments were not inspected in a running database
- no runtime validation of manager session creation or ingress header handling was performed
- only repository-visible auth-state mutation paths were reviewed

## Recommended follow-up review targets
- validate ingress/session handling with deployment owners
- add route-permission regression tests for write-capable manager routes
- review any additional admin/bootstrap tooling outside normal route/controller flows
