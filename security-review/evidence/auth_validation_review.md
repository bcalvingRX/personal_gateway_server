# Authorization and Validation Review

## Scope
- `middleware/authtoken.middleware.js`
- `middleware/input.middleware.js`
- `controllers/authentication.controller.js`
- `services/user.service.js`
- `apps/manager-app.js`

## Confirmed authorization design
### Manager routes
- use `middleware/input.middleware.js:reqCookie()`
- then use `middleware/authtoken.middleware.js:verify(location, permission)`
- `verify()`:
  - reads `res.locals.data.useremail`
  - auto-creates missing user records with `userService.createUser(email)`
  - loads permissions with `userService.getUserPermissions(email, false)`
  - grants access on exact `(location, permission)` match

### API routes
- use `reqRegToken()` plus `verifyAPIKey()`
- `verifyAPIKey()` hashes the presented key with MD5 and checks the `APIKeys` collection

### Instrument/device TLS check
- `verifyInstrument()` exists but was not observed on reviewed route definitions

## Confirmed validation design
### HTTP validation
- `valInput()` uses `matchedData(req)` and writes validated values to `res.locals.data`
- manager and API routes then consume `res.locals.data` rather than raw request objects in the reviewed paths

### Manager-route identity inputs
- `reqCookie()` requires:
  - `header("useremail")`
  - `cookie("sessID")`
- in development mode, `injectMockUser()` inserts a test header value

### API validation
- `reqRegToken()` requires `authorization` header presence and non-empty string content

## Confirmed authentication/identity flow observations
- `controllers/authentication.controller.js:getLoginInfo()` returns `res.locals.user` and permissions obtained from `userService.getUserPermissions(res.locals.user, true)`
- manager authorization in reviewed backend code is driven by validated request data and permission lookup, not by a direct session lookup in the auth middleware itself

## Positive controls present in code
- centralized HTTP input validation
- explicit allowlist-style permission checks
- separate manager and automation auth models
- Redis-backed permission caching with controller-level invalidation in reviewed mutation paths
- rate limiting on manager auth/API surfaces

## Confirmed discovery observations
1. authorization depends on the trustworthiness of `useremail` reaching `res.locals.data`
2. user records are auto-created during auth-related flows
3. first-user bootstrap assigns `Admin Group`
4. API-key-protected automation endpoints bypass the manager user/group model
5. Redis is part of authorization correctness because permissions may be served from cache

## Unknowns for focused review or manual validation
- how `useremail` is established in deployment
- whether first-user bootstrap is operationally constrained
- whether any non-reviewed mutation paths bypass cache invalidation logic
