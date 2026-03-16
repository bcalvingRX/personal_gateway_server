# Authorization and Access-Control Review

## Scope reviewed
- Authorization-enforcing middleware and permission model for manager routes.
- API-key authorization for provisioning and dirty-system processing routes.
- Representative privileged manager flows across user, system, and firmware management surfaces.

## Files/functions examined
- `middleware/input.middleware.js`
- `middleware/authtoken.middleware.js`
- `services/user.service.js`
- `routes/usermanagement.route.js`
- `routes/system.route.js`
- `routes/firmwareupdate.route.js`
- `routes/authentication.route.js`
- `routes/api.route.js`
- `controllers/usermanagement.controller.js`
- `controllers/system.controller.js`
- `controllers/fwupdatemanagement.controller.js`
- `controllers/authentication.controller.js`
- `controllers/api.controller.js`
- `services/system.service.js`
- `model/user.js`
- `model/user-group.js`
- `model/gateway-permissions.js`

## Exact authorization-enforcing files/functions
- `middleware/input.middleware.js:reqCookie()`
  - Requires `useremail` header and non-empty `sessID` cookie.
- `middleware/authtoken.middleware.js:verify(loc, per)`
  - Creates user record if absent.
  - Loads permissions through `userService.getUserPermissions()`.
  - Grants access if any permission exactly matches `{ location, name }`.
- `middleware/authtoken.middleware.js:verifyAPIKey()`
  - Looks up MD5 hash of `authorization` header in `APIKeys`.
- `services/user.service.js:getUserPermissions()`
  - Pulls effective permissions from the user's populated group.
- `services/user.service.js:editUserGroup()`
  - Expands permission changes using level ordering from the global permissions document.

## Representative traced code paths
- Login info:
  - `routes/authentication.route.js` -> `reqCookie()` -> `auth.verify(Login, Login)` -> `controllers/authentication.controller.js:getLoginInfo()` -> `userService.getUserPermissions()`
- User group assignment:
  - `routes/usermanagement.route.js:/editUser` -> `reqCookie()` -> `auth.verify(UserGroups, apply)` -> `controllers/usermanagement.controller.js:setUserGroup()` -> `userService.setUsersGroup()`
- System shell command:
  - `routes/system.route.js:/shellCommand` -> `reqCookie()` -> `auth.verify(Systems, control)` -> `controllers/system.controller.js:sendShellCommand()` -> `aws.iot.service.js:publishMessageToDevice()`
- Fleet reassignment:
  - `routes/system.route.js:/setFleet` -> `reqCookie()` -> `auth.verify(Systems, view)` -> `controllers/system.controller.js:setFleet()` -> `system.service.js:changeSystemFleet()`
- Firmware/fleet modification:
  - `routes/firmwareupdate.route.js:/modify` -> `reqCookie()` -> `auth.verify(Systems, view)` -> `controllers/fwupdatemanagement.controller.js:modifyFleet()` -> `system.service.js:modifyFleetEntry()/setDirtyBitForFleet()`

## Confirmed findings
1. Manager authentication is not bound to a verified server-side session.
   - Evidence:
   - `reqCookie()` only checks that `useremail` header exists and `sessID` cookie is non-empty.
   - `auth.verify()` authorizes directly against `res.locals.data.useremail`.
   - `apps/manager-app.js` configures `express-session`, but the reviewed auth path does not require `req.session.user`.
   - Security effect:
   - Any caller able to reach the manager app can present an arbitrary `useremail` value and a placeholder `sessID` cookie; authorization then depends only on the permissions stored for that supplied identity.
2. Privileged system and firmware mutations are protected with `SYSTEM:view` rather than a stronger mutation-oriented permission.
   - Evidence:
   - `routes/system.route.js` protects `POST /setFleet` and `POST /modify` with `auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW)`.
   - `routes/firmwareupdate.route.js` protects `POST /firmware`, `POST /group`, `POST /fleet`, and `POST /modify` with the same `SYSTEM:view` check.
   - Those handlers change fleet assignment, enrolled devices, firmware catalog entries, groups, fleets, and dirty flags in controller/service code.
   - Security effect:
   - Any role granted only view-level system access also receives multiple write-capable management actions.
3. First-user bootstrap grants administrative access based solely on arriving before any other user record exists.
   - Evidence:
   - `auth.verify()` always calls `userService.createUser(email)` before authorization.
   - `userService.createUser()` assigns `Admin Group` when `getNumUsers()` returns zero.
   - Security effect:
   - In an empty user database, first access to any manager route can establish an administrative identity without a separate bootstrap control.

## Uncertain concerns requiring manual validation
- The intended identity source for `useremail` may be an upstream proxy, service mesh, or identity-aware gateway that the repository does not include.
- The global permissions document in MongoDB was not inspected at runtime, so the exact role-to-route exposure depends on deployed permission data.
- The system may rely on operational controls to keep the manager app off untrusted networks; this cannot be confirmed statically.

## Reviewed areas with no confirmed issue identified
- User-group editing code attempts to preserve hierarchical permission semantics by expanding add/remove operations using permission levels in `services/user.service.js:editUserGroup()`.
- Shell command issuance and shell observation routes do require `SYSTEM:control`, which is stronger than the `view` gating used on several other system routes.
- API routes are distinct from manager routes and use an API-key check rather than the manager user/group permission model.

## Limitations
- Static review only; no live permission documents or seeded groups were inspected in MongoDB.
- No upstream IdP, ingress, or session-establishment code was present in the reviewed backend routes.
- No dynamic verification was performed with real headers, cookies, or roles.

## Recommended follow-up review targets
- Frontend and ingress auth flow that is expected to set `req.session.user` or trusted identity headers.
- Deployed `Permissions`, `UserGroups`, and initial user/group seed data.
- All manager-route permission mappings, especially mutation endpoints currently gated by `SYSTEM:view`.
