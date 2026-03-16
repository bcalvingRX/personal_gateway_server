# API Endpoint Map

## Manager application routes
Mounted by `apps/manager-app.js`

### `/api/auth`
- `GET /version`
- `GET /getLoginInfo`
- Security notes:
  - guarded by `reqCookie()` and `auth.verify(Login, Login)`

### `/api/users`
- `GET /users`
- `GET /userCount`
- `POST /editUser`
- `GET /userPermissions`
- `GET /userGroups`
- `GET /userGroupCount`
- `POST /createUserGroup`
- `POST /editUserGroup`
- `DELETE /userGroup`
- Security notes:
  - user/group mutation surface
  - mixed view/apply/add/edit/delete permission model

### `/api/system`
- `GET /`
- `GET /amount`
- `GET /details`
- `GET /metrics`
- `POST /setFleet`
- `GET /device_details`
- `POST /modify`
- `POST /shellCommand`
- `POST /observeShell`
- `GET /sim`
- Security notes:
  - contains both read and operational control paths
  - `shellCommand` and `observeShell` use `SYSTEM:control`
  - `setFleet` and `modify` are write-capable routes gated by `SYSTEM:view`

### `/api/fw`
- `GET /firmware`
- `POST /firmware`
- `GET /firmwareCount`
- `GET /groups`
- `POST /group`
- `GET /groupCount`
- `GET /fleetDetails`
- `GET /fleets`
- `POST /fleet`
- `POST /modify`
- `GET /fleetCount`
- Security notes:
  - firmware/group/fleet write surface
  - write routes are also gated by `SYSTEM:view`

### `/api/report`
- report template CRUD and report retrieval routes
- Security notes:
  - secondary management surface, not the primary privileged path for this review

## Automation/API application routes
Mounted by `apps/api-app.js`

### `/api`
- `POST /provisionSystem`
- `GET /processDirtySystems`
- Security notes:
  - API-key protected
  - affects provisioning and device-facing synchronization state

## Non-HTTP inbound interface
- `routes/mqtt.route.js`
  - command `info`
  - command `shell`
  - command `data`
- Security notes:
  - separate trust boundary from manager/API HTTP routes
  - inbound path for device/backend-originated operational traffic
