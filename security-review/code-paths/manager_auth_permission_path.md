# Manager Auth and Permission Path

## Purpose
Trace how manager-app requests become authenticated and authorized.

## Path

Manager request
→ route validator (typically `reqCookie()`)
→ `valInput()`
→ `res.locals.data.useremail`
→ `auth.verify(location, permission)`
→ `userService.createUser(email)`
→ `userService.getUserPermissions(email, false)`
→ permission match against `(location, permission)`
→ controller handler

## Confirmed Components

### Validation
File: `middleware/input.middleware.js`

`reqCookie()` requires:
- `useremail` header
- `sessID` cookie

On success:
- sanitized values placed into `res.locals.data`

### Authorization
File: `middleware/authtoken.middleware.js`

`verify(loc, per)`:
- reads `res.locals.data.useremail`
- loads permissions
- grants or denies based on group permissions

### Session-linked identity retrieval
File: `controllers/authentication.controller.js`

`getLoginInfo()`:
- reads `req.session.user`
- creates user if needed
- refreshes permissions with `getUserPermissions(email, true)`

### Permission storage
File: `services/user.service.js`

Permissions source:
- Redis cache first
- MongoDB user → group → permissions fallback

## Trust Dependencies

1. `useremail` must come from a trusted source
2. validators must execute before `auth.verify`
3. Redis permission cache must remain consistent with group changes
4. initial admin-group bootstrap must be controlled

## Review Follow-Up

- confirm exact source of `req.session.user`
- confirm whether user-controlled headers can influence `useremail`
- trace protected system-control routes next