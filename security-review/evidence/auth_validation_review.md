# Authorization and Validation Review
Repository: walkasins-gateway-server

## Scope
- `middleware/authtoken.middleware.js`
- `middleware/input.middleware.js`
- `controllers/authentication.controller.js`
- `services/user.service.js`

## Confirmed Authorization Design

### Manager routes
Manager routes use `auth.verify(location, permission)` from `middleware/authtoken.middleware.js`.

Observed behavior:
- reads identity from `res.locals.data?.useremail`
- in development mode, falls back to `test.admin1@rxfunction.com`
- calls `userService.createUser(email)` before permission evaluation
- loads permissions with `userService.getUserPermissions(email, false)`
- grants access when a matching `(location, permission)` pair exists

### API routes
API-style routes use `verifyAPIKey(req, res, next)`.

Observed behavior:
- reads API key from `res.locals.data.authorization`
- hashes key with MD5 in `user.service.js`
- checks existence in `APIKey` collection

### Instrument/device path
`verifyInstrument(req, res, next)` checks TLS socket state:
- `requestCert === true`
- `rejectUnauthorized === true`
- one CA configured
- `req.socket.authorized === true`

This is a separate trust boundary from browser/session-based auth.

---

## Confirmed Validation Design

### Centralized validation
`middleware/input.middleware.js` uses `express-validator`.

Observed pattern:
- route-specific validators sanitize and validate inputs
- `valInput()` writes validated fields to `res.locals.data = matchedData(req)`
- invalid input returns HTTP 400

### Session/cookie manager validation
`reqCookie()` requires:
- `header("useremail").exists().trim().escape().isString()`
- `cookie("sessID").exists().notEmpty()`

In development mode:
- `injectMockUser()` inserts `req.headers.useremail = "test.admin1@rxfunction.com"`

### API key validation
`reqRegToken()` requires:
- `authorization` header exists
- is string
- not empty

---

## Confirmed Authentication/Identity Flow

### `controllers/authentication.controller.js`
`getLoginInfo(req, res, next)`:
- reads `req.session.user`
- creates user with `userService.createUser(userDetails.email)`
- fetches permissions with `userService.getUserPermissions(userDetails.email, true)`
- returns:
  - `name`
  - `permissions`

This confirms the manager app is using session-backed identity and permission retrieval.

---

## Confirmed User/Permission Model

### `services/user.service.js`
`createUser(user)`:
- checks whether the user exists
- if not, creates a user record
- if this is the first user in the database, assigns `"Admin Group"`
- otherwise assigns `"Default Group"`

`getUserPermissions(user, updateCache)`:
- reads cached permissions from Redis when allowed
- otherwise loads user and populated group from MongoDB
- caches permissions in Redis

This confirms:
- user records are auto-provisioned
- permissions come from group membership
- Redis is part of the authorization path

---

## Positive Controls Present in Code

- explicit permission checks by location + permission
- centralized input validation with `matchedData(req)`
- separate auth models for:
  - session user
  - API key
  - instrument TLS
- Redis-backed permission caching
- failed validation returns 400
- failed auth returns 401/403

---

## Confirmed Security-Relevant Observations

### 1. Authorization depends on validated `useremail`
`verify()` reads identity from `res.locals.data.useremail`, not directly from the session.

Implication:
- protected routes rely on validator/middleware ordering
- protected routes also rely on the trustworthiness of how `useremail` is established

### 2. User records are auto-created during auth flow
Both `verify()` and `getLoginInfo()` call `userService.createUser(email)`.

Implication:
- authenticated identities can trigger account creation as a side effect

### 3. First created user becomes admin
`createUser()` assigns `"Admin Group"` when `getNumUsers() === 0`.

Implication:
- initial bootstrap state is security-critical
- this is code-confirmed and should be reviewed as an administrative trust decision

### 4. API key auth is separate from role-based user auth
Provisioning/API routes may bypass the manager session/permission model and rely only on API key presence.

Implication:
- provisioning and backend operational endpoints remain high-priority review targets

### 5. Redis cache is in the authorization path
Permission data may come from Redis or MongoDB.

Implication:
- permission consistency and cache invalidation matter for admin/group changes

---

## Questions Requiring Deeper Review

These are not findings yet. They need more code tracing or runtime validation.

1. How is `useremail` originally derived for manager routes?
   - trusted session/auth middleware
   - proxy/header propagation
   - client-controlled header
   This must be confirmed.

2. Is the “first user becomes admin” behavior safe in production bootstrap workflows?

3. Do controllers consistently use `res.locals.data` instead of raw request objects?

4. Are permission-cache invalidation paths present after user/group changes?

5. Are API-key-protected provisioning routes sufficiently constrained for their operational impact?

---

## Next Review Targets

1. `controllers/system.controller.js`
2. `services/system.service.js`
3. `controllers/fwupdatemanagement.controller.js`
4. `services/aws.iot.service.js`
5. `services/redis.service.js`
