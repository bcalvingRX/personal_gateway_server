# Privileged Operations Inventory

## Purpose
Inventory privileged or security-sensitive operations visible in the repository and note the trust boundary crossed before each executes.

| Operation | File / function | Trigger | Trust boundary crossed first | Authorization / validation before operation |
| --- | --- | --- | --- | --- |
| Manager route authorization | `middleware/authtoken.middleware.js:verify()` | manager HTTP request | manager client -> manager app | `reqCookie()` populates validated request data; permission lookup follows |
| API key authorization | `middleware/authtoken.middleware.js:verifyAPIKey()` | automation HTTP request | automation client -> API app | `reqRegToken()` validates `authorization` header |
| Create user during auth flow | `services/user.service.js:createUser()` | manager auth path / login info | manager client -> manager app | invoked from `verify()` or login path before/with authorization logic |
| Set user group | `controllers/usermanagement.controller.js:setUserGroup()` | `POST /api/users/editUser` | manager client -> manager app | `reqCookie()`, `auth.verify(UserGroups, apply)`, route validator |
| Edit user group permissions | `controllers/usermanagement.controller.js:editUserGroup()` | `POST /api/users/editUserGroup` | manager client -> manager app | `reqCookie()`, `auth.verify(UserGroups, edit)`, route validator |
| Delete user group | `controllers/usermanagement.controller.js:deleteUserGroup()` | `DELETE /api/users/userGroup` | manager client -> manager app | `reqCookie()`, `auth.verify(UserGroups, delete)`, route validator |
| Change system fleet | `controllers/system.controller.js:setFleet()` | `POST /api/system/setFleet` | manager client -> manager app | `reqCookie()`, `auth.verify(Systems, view)`, route validator |
| Modify system device membership | `controllers/system.controller.js:modifySystem()` | `POST /api/system/modify` | manager client -> manager app | `reqCookie()`, `auth.verify(Systems, view)`, route validator |
| Publish shell command to device | `controllers/system.controller.js:sendShellCommand()` | `POST /api/system/shellCommand` | manager client -> manager app | `reqCookie()`, `auth.verify(Systems, control)`, route validator |
| Register firmware metadata | `controllers/fwupdatemanagement.controller.js:saveFirmware()` | `POST /api/fw/firmware` | manager client -> manager app | `reqCookie()`, `auth.verify(Systems, view)`, route validator, upstream existence check |
| Create group / fleet | `controllers/fwupdatemanagement.controller.js:saveGroup()` / `saveFleet()` | manager HTTP request | manager client -> manager app | `reqCookie()`, `auth.verify(Systems, view)`, route validator |
| Modify fleet targeting | `controllers/fwupdatemanagement.controller.js:modifyFleet()` | `POST /api/fw/modify` | manager client -> manager app | `reqCookie()`, `auth.verify(Systems, view)`, route validator |
| Provision system and devices | `controllers/api.controller.js:provisionSystem()` | `POST /api/provisionSystem` | automation client -> API app | `reqRegToken()`, `verifyAPIKey()`, route validator |
| Process dirty systems and update device shadows | `controllers/api.controller.js:processDirtySystems()` / `processSystem()` | `GET /api/processDirtySystems` | automation client -> API app | `reqRegToken()`, `verifyAPIKey()` |
| Persist inbound metrics | `controllers/system.controller.js:storeSystemMetrics()` | inbound MQTT `info` message | AWS IoT/SQS -> inbound dispatcher | `mqtt-input.middleware.js:reqMetrics` |
| Publish inbound shell response to Redis | `controllers/system.controller.js:processSystemShellResponse()` | inbound MQTT `shell` message | AWS IoT/SQS -> inbound dispatcher | `mqtt-input.middleware.js:reqShellResp` |
| Serve firmware / manifest / random data to device | `controllers/system.controller.js:processSystemGetFile()` | inbound MQTT `data` message | AWS IoT/SQS -> inbound dispatcher | `mqtt-input.middleware.js:reqDataResp` |
| Generate presigned URL and upload/cache object in S3 | `controllers/system.controller.js:processSystemDataRequest()` | invoked from `processSystemGetFile()` | inbound MQTT path or OTA flow | depends on upstream handler; no separate device entitlement check visible here |

## Notes for focused review
- several privileged manager write operations execute after only `SYSTEM:view` route permission checks
- the inbound device `data` path reaches presigned URL generation and OTA retrieval behavior
- provisioning and dirty-system processing are operationally powerful but isolated behind API-key auth rather than manager user/group auth
