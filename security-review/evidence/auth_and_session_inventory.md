# Auth and Session Inventory

## Manager-side identity and authorization
- Session middleware configured in `apps/manager-app.js`
- Session store backed by Redis via `connect-redis`
- `reqCookie()` requires:
  - `useremail` header
  - `sessID` cookie
- `auth.verify(loc, per)`:
  - reads `res.locals.data.useremail`
  - auto-creates missing users
  - loads permissions from Redis or MongoDB-backed group state

## Automation/API authorization
- `reqRegToken()` validates `authorization` header
- `verifyAPIKey()` hashes the presented key with MD5 and looks for a matching record in `APIKeys`

## Authorization state model
- user -> group -> permissions
- permissions cached in Redis for 1 hour
- reviewed group/user mutation controllers clear permission-cache entries after major changes

## Discovery observations
- backend authorization logic is not visibly session-bound in code; it is request-data-bound
- first user auto-created in an empty user store is assigned `Admin Group`
