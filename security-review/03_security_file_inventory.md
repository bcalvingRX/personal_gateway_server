# Security Relevant File Inventory

## Server Initialization
- `index.js`
- `logger.js`

## Applications
- `apps/api-app.js`
- `apps/manager-app.js`

## Routes (External Entry Points)
- `routes/api.route.js`
- `routes/authentication.route.js`
- `routes/firmwareupdate.route.js`
- `routes/mqtt.route.js`
- `routes/report.route.js`
- `routes/system.route.js`
- `routes/usermanagement.route.js`

## Middleware

`middleware/authtoken.middleware.js`  
Authentication token verification.

`middleware/input.middleware.js`  
Input validation.

`middleware/mqtt-input.middleware.js`  
MQTT message validation.

`middleware/rate-limit.middleware.js`  
API rate limiting.

`middleware/error-handler.middleware.js`  
Centralized error handling.

## Controllers
- `controllers/api.controller.js`
- `controllers/authentication.controller.js`
- `controllers/fwupdatemanagement.controller.js`
- `controllers/report.controller.js`
- `controllers/system.controller.js`
- `controllers/usermanagement.controller.js`

## Services
- `services/user.service.js`
- `services/system.service.js`
- `services/aws.iot.service.js`
- `services/aws.sqs.service.js`
- `services/aws.athena.service.js`
- `services/database.service.js`
- `services/redis.service.js`

## Models
- `model/user.js`
- `model/user-group.js`
- `model/user-access.js`
- `model/api-key.js`
- `model/gateway-permissions.js`

Device-related models:
- `model/w200/`

## Security Assets
- `certs/`
- `.env`
- `Dockerfile`
- `Jenkinsfile`
