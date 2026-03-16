# Middleware Inventory

## HTTP middleware
- `middleware/input.middleware.js`
  - manager/API input validation and matched-data extraction
  - `reqCookie()` enforces `useremail` header plus `sessID` cookie presence
  - route-specific validators sanitize and shape request data

- `middleware/authtoken.middleware.js`
  - manager permission checks via `verify(loc, per)`
  - API-key checks via `verifyAPIKey()`
  - unused reviewed TLS instrument check via `verifyInstrument()`

- `middleware/rate-limit.middleware.js`
  - global manager/API rate limits
  - auth-specific rate limiting

- `middleware/error-handler.middleware.js`
  - centralized error handling

## Inbound message middleware
- `middleware/mqtt-input.middleware.js`
  - base command/gateway validation
  - command-specific validation for `info`, `shell`, and `data`
  - reduced argument passing into controller handlers

## Architectural note
Manager-route security properties depend heavily on middleware order because validation populates `res.locals.data` and authorization then consumes that state.
