# API Endpoint Map

## Plain English Description
This document maps the main externally reachable entry points in the gateway server.

The repository exposes two primary HTTP application surfaces:

- a manager-facing administrative application
- an API-facing application for backend or automated workflows

It also exposes a separate inbound device/backend messaging path through MQTT-style message handling.

This file exists to define the attack surface before deeper authorization and code-path review.

---

## Purpose
Identify the main route groups and externally reachable entry points so later review artifacts can focus on the highest-risk paths first.

---

## Applications

### Manager Application
File: `apps/manager-app.js`

Mounted route groups:
- `/api/fw`
- `/api/users`
- `/api/auth`
- `/api/report`
- `/api/system`

Security relevance:
This is the main administrative and control-plane surface.

### API Application
File: `apps/api-app.js`

Mounted route group:
- `/api`

Security relevance:
This is the main programmatic and backend automation surface.

---

## Manager Route Groups

### Authentication Routes
Route file: `routes/authentication.route.js`

Purpose:
- authentication-related manager functionality
- login/session information
- manager identity handling

Security relevance:
This is the starting point for manager identity and session-based access.

### User Management Routes
Route file: `routes/usermanagement.route.js`

Purpose:
- user listing
- user counts
- user-group assignment
- group creation, edit, and deletion
- permission-related operations

Security relevance:
This route group directly affects authorization state.

### Firmware Update Management Routes
Route file: `routes/firmwareupdate.route.js`

Purpose:
- firmware metadata management
- group management
- fleet management
- firmware-to-group assignment changes

Security relevance:
These routes influence downstream device update behavior.

### Report Routes
Route file: `routes/report.route.js`

Purpose:
- report retrieval
- report template creation/update/deletion

Security relevance:
Potential data exposure surface.

### System Routes
Route file: `routes/system.route.js`

Purpose:
- system listing and detail retrieval
- metrics retrieval
- fleet assignment changes
- system modification
- shell command sending
- shell observation
- SIM detail retrieval

Security relevance:
This is one of the highest-risk route groups because it contains operational control functionality.

---

## API Route Group

### API Routes
Route file: `routes/api.route.js`

Confirmed key routes:
- `POST /api/provisionSystem`
- `GET /api/processDirtySystems`

Purpose:
- system provisioning
- dirty-system processing

Security relevance:
This surface is API-key protected and directly affects provisioning and device-facing synchronization.

---

## Inbound Messaging Surface

### MQTT / Device Messaging Route
Route file: `routes/mqtt.route.js`

Observed inbound command types:
- `info`
- `shell`
- `data`

Purpose:
- metrics ingestion
- shell response handling
- file/data response handling

Security relevance:
This is a separate inbound trust boundary from the manager and API HTTP routes.

---

## High-Risk Route Areas

Based on route purpose alone, the highest-priority areas for deeper review are:

1. `routes/system.route.js`
   - contains shell command and system-control functionality

2. `routes/firmwareupdate.route.js`
   - affects firmware rollout and fleet assignment state

3. `routes/usermanagement.route.js`
   - affects users, groups, and effective permissions

4. `routes/api.route.js`
   - contains provisioning and dirty-system processing

5. `routes/mqtt.route.js`
   - handles inbound device/backend messaging

---

## Review Notes

This file is intentionally a route-group map, not a line-by-line route table.

Later artifacts refine this attack surface by reviewing:
- authentication and validation middleware
- manager authorization path
- shell command path
- firmware management path
- dirty-system processing path
- inbound messaging path

---

## Next Review Targets

1. `middleware/authtoken.middleware.js`
2. `middleware/input.middleware.js`
3. `routes/system.route.js`
4. `routes/usermanagement.route.js`
5. `routes/firmwareupdate.route.js`
