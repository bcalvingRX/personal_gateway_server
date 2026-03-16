# Manager Auth and Permission Path

## Purpose of the path
Establish manager identity and enforce route permissions before privileged manager controllers execute.

## Entry point
- any manager route using:
  - `middleware/input.middleware.js:reqCookie()`
  - `middleware/authtoken.middleware.js:verify(loc, per)`

Representative routes:
- `/api/auth/getLoginInfo`
- `/api/users/editUser`
- `/api/system/shellCommand`
- `/api/fw/modify`

## Files/functions traversed
- `apps/manager-app.js`
- `middleware/input.middleware.js:reqCookie()`
- `middleware/input.middleware.js:valInput()`
- `middleware/authtoken.middleware.js:verify()`
- `services/user.service.js:createUser()`
- `services/user.service.js:getUserPermissions()`
- target controller handler

## Trust-boundary crossings
- manager client -> manager HTTPS app
- manager app -> Redis permission cache
- manager app -> MongoDB user/group state

## Security-relevant decisions
- identity source is `res.locals.data.useremail`
- request only needs a non-empty `sessID` cookie to pass `reqCookie()`
- permission enforcement is exact-match on `(location, permission)`
- missing users are auto-created during auth flow
- cached permissions may be served from Redis

## Downstream privileged actions
- user/group mutation
- shell command publication
- system and fleet mutation
- firmware/group/fleet administration

## Unknowns requiring runtime or deployment validation
- how `useremail` is established before it reaches the app
- whether upstream controls prevent client-controlled identity headers
- whether all auth-state mutation paths consistently invalidate cache
