# Trust Boundaries

## External Users
User browser or client applications accessing the gateway via HTTPS.

Boundary:
Internet → Gateway server

Controls:
- TLS
- Azure AD authentication
- session tokens
- input validation
- rate limiting

---

## Device Communication

Devices communicate through:
AWS IoT

Boundary:
Device → AWS IoT → Gateway server

Controls:
- device certificates
- AWS IoT policies
- MQTT message validation

Relevant files:
- `services/aws.iot.service.js`
- `middleware/mqtt-input.middleware.js`
- `routes/mqtt.route.js`

---

## Backend Services

Gateway server communicates with:
- MongoDB
- Redis
- AWS services

Boundary:
Gateway → internal infrastructure

Sensitive data:
- device telemetry
- firmware metadata
- user records
- permissions
- fleet management data

---

## Administrative Interface

Manager application appears to expose privileged operations.

Files:
- `apps/manager-app.js`
- `routes/system.route.js`
- `routes/usermanagement.route.js`

Boundary:
Administrator → Gateway management endpoints

Risk:
Privilege escalation or authorization bypass.
