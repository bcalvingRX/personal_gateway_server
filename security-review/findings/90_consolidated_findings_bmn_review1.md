# Consolidated Findings

## Executive summary
This consolidated record is derived from the repository-backed review artifacts generated for architecture/attack surface, authorization/access control, inbound device-message trust boundaries, and firmware/OTA orchestration. It does not introduce new findings. Confirmed findings below are limited to issues supported by current repository code. Uncertain concerns remain separated and require deployment or runtime validation.

## Confirmed findings

### Finding ID: CF-01
Title: Manager-route identity is derived from request metadata rather than a verified session
Confidence: High
Affected files/functions:
- `middleware/input.middleware.js:reqCookie()`
- `middleware/authtoken.middleware.js:verify()`
- `services/user.service.js:getUserPermissions()`
- `apps/manager-app.js`
Evidence code paths:
- `apps/manager-app.js` session middleware setup and request logging, including `req.session.user` handling at lines 48-68
- `middleware/input.middleware.js:reqCookie()` at lines 28-32
- `middleware/authtoken.middleware.js:verify()` at lines 28-53
- `services/user.service.js:getUserPermissions()` at lines 48-66
Description:
Manager routes accept identity from the `useremail` request header and only require that a `sessID` cookie be present and non-empty. The reviewed authorization flow does not require that the supplied identity be bound to `req.session.user` or otherwise validated against server-side session state before permission checks occur.
Security impact:
If an untrusted caller can reach the manager app and supply headers/cookies directly, the caller can attempt authorization as any stored user identity by presenting that user's email address.
Why this is a finding:
The code path that authorizes manager requests is explicitly header-driven. Session middleware exists, but the reviewed enforcement path does not depend on session-backed identity.
Recommended remediation / follow-up:
- Bind authorization to a verified server-side session or equivalent trusted identity assertion.
- Reject client-supplied identity headers unless they are injected and authenticated by trusted infrastructure.
- Validate whether the intended upstream control already exists and document that dependency explicitly.
Source review artifact(s):
- `06_initial_architecture_attack_surface_analysis.md`
- `07_authorization_access_control_review.md`

### Finding ID: CF-01 Engineer review
This finding correctly identifies both dependencies and assumptions that the backend W-200 server makes with regard to the rest of the RxFunction cloud infrastructure. 
All requests from external clients, external meaning clients outside of the Kubernetes cluster in which this server is running in, are routed through a flow that is intended to mitigate the findings in CF-01. Below is a simplified outline of that flow:
External client (port 443 - standard HTTPS) ->
port 8081 internal targetPort of load balancer, forwarding into the pod (https://github.com/RxFunction/walkasins-gateway.git - rxfunction-app-lb-service.yaml - L18 (routes to frontend deployment rxfunction-app-deployment.yaml L25)) ->
location / (https://github.com/RxFunction/walkasins-gateway-frontend.git - nginx.conf.template - L74) ->
127.0.0.1:4180:/oauth2/auth (https://github.com/RxFunction/walkasins-gateway-frontend.git - nginx.conf.template - L39) -> 
127.0.0.1:4180:/oauth2/auth (https://github.com/RxFunction/walkasins-gateway.git - rxfunction-app-deployment.yaml L40) ->
Session cookie checked against Redis rxfunction-app-deployment.yaml L59 (redis://rxfunction-gw-redis:6379 (https://github.com/RxFunction/walkasins-gateway.git - redis-deployment.yaml) ->
ON FAILURE:
returns 401 -> directed to /oauth2/start (https://github.com/RxFunction/walkasins-gateway-frontend.git - nginx.conf.template - L76) -> 
http://127.0.0.1:4180:/oauth2/start (https://github.com/RxFunction/walkasins-gateway-frontend.git - nginx.conf.template - L33) -> 
127.0.0.1:4180:/oauth2/start (https://github.com/RxFunction/walkasins-gateway.git - rxfunction-app-deployment.yaml L40) ->
https://login.microsoftonline.com (Azure - redirects to https://walkasins.rxfunction.app/api/auth/response (https://github.com/RxFunction/walkasins-gateway.git - rxfunction-app-deployment.yaml L62)) ->
/api/auth/response (https://github.com/RxFunction/walkasins-gateway-frontend.git - nginx.conf.template - L53) -> 
/oauth2/callback (oauth2-proxy - Sets up session (exchanges auth tokens/validates OIDC token/checks email domain/creates redis session keys/sets session cookie/sets redirects https://github.com/RxFunction/walkasins-gateway.git - rxfunction-app-deployment.yaml L40)) ->
redirects logged in user to backend /landing - Go to 'ON SUCCESS' below

ON SUCCESS:
All subsequent requests go through /oauth2/auth - Session cookie checked against redis (https://github.com/RxFunction/walkasins-gateway.git - redis-deployment.yaml).
CRITICAL - nginx forwards authorized email/user/access token to backend requests, overwriting user provided values
user/email overwriting logic is here: L78, L79, L80–82 (https://github.com/RxFunction/walkasins-gateway-frontend.git - nginx.conf.template)


Bonus info - all external requests must also pass mutual authentication at L19 of nginx.conf.template. The CA that authenticates the connecting client
is set to the cloudflare CA, forcing external requests to first go through the cloudflare proxy and prevent any requests directly to the publically facing load balancer.

Assumptions - This flow is only secure as long as the cluster itself is secure. A compromised kubernetes cluster can bypass the email header injection point and skip OAUTH checks as well. 

### Finding ID: CF-02
Title: First-user bootstrap assigns administrative access when the user database is empty
Confidence: High
Affected files/functions:
- `middleware/authtoken.middleware.js:verify()`
- `services/user.service.js:createUser()`
Evidence code paths:
- `middleware/authtoken.middleware.js:verify()` at lines 41-46
- `services/user.service.js:createUser()` at lines 69-90
Description:
Before authorization completes, the code creates a user record if the presented identity does not already exist. When the total user count is zero, the new record is assigned to `Admin Group`.
Security impact:
In an empty or reset user database, first access can establish an administrative user without a separate bootstrap approval step.
Why this is a finding:
The behavior is explicit in the repository code and is not contingent on any additional in-repo checks.
Recommended remediation / follow-up:
- Replace implicit first-user bootstrap with a controlled provisioning or seed process.
- Confirm whether production deployments always pre-seed users/groups before exposure.
- Add an operational guard to prevent accidental re-entry into bootstrap state after resets or migrations.
Source review artifact(s):
- `06_initial_architecture_attack_surface_analysis.md`
- `07_authorization_access_control_review.md`


### Finding ID: CF-02 Engineer review
This finding correctly identifies a explicit bootstrap sequence. This was a preliminary measure that can possibly be replaced with a more controlled bootstram sequence, as mentioned in the above remediations. Recommend backend logic and development of deployment/initial provisioning protocols.


### Finding ID: CF-03
Title: Write-capable system and firmware routes are gated only by `SYSTEM:view`
Confidence: High
Affected files/functions:
- `routes/system.route.js`
- `routes/firmwareupdate.route.js`
- `controllers/system.controller.js:setFleet()`
- `controllers/system.controller.js:modifySystem()`
- `controllers/fwupdatemanagement.controller.js:saveFirmware()`
- `controllers/fwupdatemanagement.controller.js:saveGroup()`
- `controllers/fwupdatemanagement.controller.js:saveFleet()`
- `controllers/fwupdatemanagement.controller.js:modifyFleet()`
Evidence code paths:
- `routes/system.route.js:/setFleet` at lines 31-33 -> `systemController.setFleet()`
- `routes/system.route.js:/modify` at lines 41-43 -> `systemController.modifySystem()`
- `routes/firmwareupdate.route.js:/firmware` at lines 15-17 -> `fwManagementController.saveFirmware()`
- `routes/firmwareupdate.route.js:/group` at lines 28-30 -> `fwManagementController.saveGroup()`
- `routes/firmwareupdate.route.js:/fleet` at lines 45-47 -> `fwManagementController.saveFleet()`
- `routes/firmwareupdate.route.js:/modify` at lines 49-51 -> `fwManagementController.modifyFleet()`
- `controllers/fwupdatemanagement.controller.js:modifyFleet()` at lines 236-245
Description:
Several routes that mutate system assignment, enrolled devices, firmware records, groups, fleets, and fleet-to-firmware mappings are protected with `auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW)` rather than a mutation-oriented permission.
Security impact:
Roles intended for read-only system visibility may receive write capability across operationally sensitive management functions.
Why this is a finding:
The mismatch between route behavior and permission label is directly visible in the route definitions and downstream controller logic.
Recommended remediation / follow-up:
- Reclassify mutating routes to use edit/add/apply/control/manage semantics consistent with intended role separation.
- Review deployed `Permissions` and `UserGroups` documents to determine present exposure.
- Add regression tests that assert each mutation route requires a non-view permission.
Source review artifact(s):
- `07_authorization_access_control_review.md`

### Finding ID: CF-03 Engineer review
This finding correctly identifies a mismatch between intuitive access controls for firmware controls. The recommended remediation should be performed.

### Finding ID: CF-04
Title: Inbound device `data` requests are served by identifier without gateway-to-fleet entitlement checks
Confidence: High
Affected files/functions:
- `routes/mqtt.route.js:process()`
- `middleware/mqtt-input.middleware.js:reqDataResp`
- `controllers/system.controller.js:processSystemGetFile()`
- `controllers/system.controller.js:processSystemGetFWManifest()`
- `controllers/system.controller.js:processSystemGetFirmware()`
- `services/system.service.js:getFirmware()`
- `services/system.service.js:getFirmwareManifest()`
Evidence code paths:
- `routes/mqtt.route.js` maps `data` to `systemController.processSystemGetFile()` at lines 12-26
- `middleware/mqtt-input.middleware.js:reqDataResp` at lines 25-29
- `controllers/system.controller.js:processSystemGetFile()` at lines 284-295
- `controllers/system.controller.js:processSystemGetFWManifest()` at lines 259-267
- `controllers/system.controller.js:processSystemGetFirmware()` at lines 270-280
- `services/system.service.js:getFirmwareManifest()` at lines 280-283
Description:
The inbound device file-request path validates only field shape and requested type. Firmware is resolved by requested `firmware_id`, and manifests are resolved by requested `state_hash`. The reviewed code does not resolve the requesting `thingID` to a system/fleet and confirm that the request is authorized for that system's assigned firmware or manifest.
Security impact:
Any principal able to send trusted `data` requests can request arbitrary known firmware IDs or manifest hashes through the backend delivery path.
Why this is a finding:
The absence of an entitlement check is visible in the end-to-end request path from MQTT validation to file lookup and publish-back.
Recommended remediation / follow-up:
- Resolve `thingID` to system/fleet before serving firmware or manifest URLs.
- Restrict manifest access to the active manifest associated with the requesting system.
- Add tests covering denial of off-fleet firmware and manifest requests.
Source review artifact(s):
- `08_inbound_device_message_trust_boundary_review.md`
- `09_firmware_manifest_file_delivery_ota_review.md`

### Finding ID: CF-04 Engineer review
This finding highlights both an improvement in security as well as a security dependency between AWS IoT Core and the RxFunction backend server. 

Dependency (ClientID/ThingID):
The thingID field of incoming MQTT messages is used by the backend server to log and route various requests. Just-In-Time AWS thing registration is leveraged to assign RxFunction approved in-field gateways to thingIDs and add the clients certificate to known and approved devices. As part of this registration, the RxFunction gateway is assigned to the thing group "gateway" that restrics the gateway, only allowing it to publish/subscribe on designated topics. The subscribe topics are further restricted such that the registered client certificate can only subscribe to topics that match its registered thingID (present in the topic name). Publishing, which is the same topic across all in-field devices, come in on a disginated topic that has a AWS Rule attached. Each topic has its own rule, but an example of a rule for the gateawy/send/cbor topic is:

SELECT aws_lambda("arn:aws:lambda:us-east-2:637423169020:function:cborToJSON:Test", {"payload": encode(*, 'base64'), "topic": topic(), "gateway": clientid()}).message AS payload FROM 'gateway/send/cbor'

The "gateway" field is directly assigned to the AWS clientID, from the AWS IoT Core registration. This overwrites any client supplied "gateway" field and prevents spoofing of client IDs to the backend server. The AWS Lambda function cborToJSON will convert and republish the incoming payload to an AWS SQS queue, which the backend server moniters and pulls requests out of.

To ensure this pathway remains secure, proper protection of any new topics or pathways where gateway devices can communicate with the backend is essential. This can be done through our in-place AWS IoT Core Rules as described above.

Improvement:
The second half of this finding relates to the restriction of registered devices from requesting content unrelated to their forseen operation. Currently, a registered gateway may download any manifest or firmware file that the backend server provides. The firmware files themselves and properly protected and the manifest files are a list of hashes - neither pose a security concern by themselves. This also ensures that gateway devices in the field have some autonimity with regards to how they manage their in-field systems. To expand, gateways that are used on manufacturing floors, clinical trials, development environemnts, or replacement flows can request firmware files preematively from backend services without waiting for backend service syncronization or out-of-band communcation. 

Still, the finding clearly outlines a trust boundary that may not hold true over all (or in fact most) scenarios in the W-200 system. Engineering proposes restriction on requested firmware files and manifests as a new default configuration, which will nessecitate backend checks on these styles of requests. To propertly support the rest of the edge cases listed above, the gateway backend should support allowing legacy retrievals that have access to a broader set of resources through some overarching access setting. This setting can be individually applied to gateways, or more appropriately perhaps, set to a fleet of gateways to support a collection of gateways on trusted manufacturing or provisioning workflows (and not the general patient population)


### Finding ID: CF-05
Title: Backend OTA delivery does not verify firmware binary integrity before caching and serving
Confidence: High
Affected files/functions:
- `controllers/fwupdatemanagement.controller.js:saveFirmware()`
- `controllers/system.controller.js:processSystemGetFirmware()`
- `services/github.service.js:checkFirmwareExists()`
- `services/greenlightguru.service.js:checkFirmwareExists()`
- `services/system.service.js:createStateRecord()`
- `services/aws.athena.service.js:uploadToS3()`
Evidence code paths:
- `controllers/fwupdatemanagement.controller.js:saveFirmware()` at lines 74-133
- `controllers/system.controller.js:processSystemGetFirmware()` at lines 270-280
- `controllers/system.controller.js:processSystemDataRequest()` at lines 182-224
- `services/system.service.js:createStateRecord()` at lines 290-321
- `services/github.service.js:checkFirmwareExists()` at lines 5-20
- `services/greenlightguru.service.js:checkFirmwareExists()` at lines 7-27
Description:
Firmware registration verifies that an upstream file exists, and firmware delivery downloads bytes from the upstream source and uploads them to S3 for device retrieval. The reviewed backend does not compute or verify a cryptographic digest or signature over the binary before caching or serving it. The state-record hashing logic uses MurmurHash over identifier tuples, not firmware contents.
Security impact:
The OTA backend relies on upstream source trust and successful transport, without an in-repo integrity control that would detect modified or substituted binaries before distribution.
Why this is a finding:
The repository contains the full server-side retrieval and delivery path, and no backend integrity-verification step is present in that path.
Recommended remediation / follow-up:
- Persist an expected cryptographic digest or signature with each firmware record.
- Verify the downloaded binary before S3 upload and before URL issuance if caching is refreshed.
- Confirm whether device-side verification exists and align backend metadata with that control.
Source review artifact(s):
- `09_firmware_manifest_file_delivery_ota_review.md`

### Finding ID: CF-05 Engineer review
This finding proposes an enhancement of the firmware file retrieval flow, for integrity checking and authentication purposes. Should this enhancement not be introduced, then firmware update files that have been previously registered at selected endpoints may undergo modification without proper detection. While firmware packages are digitally signed and checked prior to deployment by the edge-device, this doesnt  prevent one genuine firmware package from being replaced by another genuine, but different, firmware package. Engineering agreed with the finding and proposes saving a hash at the time of firmware record creation, to ensure endpoint binaries are not modified at a later time. 

Additionally, firmware update packets are signed through IAR public keys and as such, can be verified as genuine by the backend server at the time of registration. This may also be an enhancement to prevent possible user error when registering firmware packages. This is also a recommended change.

### Finding ID: CF-06
Title: GitHub OTA retrieval path appears inconsistent with the metadata stored for GitHub firmware
Confidence: Medium
Affected files/functions:
- `controllers/fwupdatemanagement.controller.js:saveFirmware()`
- `controllers/system.controller.js:processSystemGetFirmware()`
- `services/system.service.js:saveFirmware()`
- `services/github.service.js:checkFirmwareExists()`
- `services/github.service.js:downloadFirmwareRevision()`
Evidence code paths:
- `services/github.service.js:checkFirmwareExists()` returns `asset.id` at lines 15-20
- `controllers/fwupdatemanagement.controller.js:saveFirmware()` stores GitHub firmware via `systemService.saveFirmware(...)` at lines 112-133
- `services/system.service.js:saveFirmware()` stores `org`, `repo`, `tag`, and `file`, but no asset ID, at lines 67-78
- `controllers/system.controller.js:processSystemGetFirmware()` calls `ghService.downloadFirmwareRevision(firmwareInfo.org, firmwareInfo.repo, firmwareInfo.tag, firmwareInfo.file)` at lines 277-280
- `services/github.service.js:downloadFirmwareRevision(id)` constructs the download URL from a single `id` parameter at lines 36-43
Description:
The GitHub lookup path identifies the asset by release asset ID, but the persisted firmware record does not retain that ID. The later download function expects a single ID argument, while the delivery path passes GitHub metadata fields instead.
Security impact:
GitHub-backed firmware distribution may fail or retrieve the wrong object, reducing confidence in OTA availability for GitHub-sourced firmware.
Why this is a finding:
The mismatch is visible in the stored metadata, the later function signature, and the call site used during delivery.
Recommended remediation / follow-up:
- Persist the GitHub asset ID returned during registration and use that exact value during download.
- Add an integration test that registers and serves a GitHub-backed firmware asset end to end.
- Review already stored GitHub firmware records for compatibility with the corrected path.
Source review artifact(s):
- `09_firmware_manifest_file_delivery_ota_review.md`

### Finding ID: CF-06 Engineer review
This finding is outlining a mismatch between retrieved data from checkFirmwareExists, and subsequent access functions. The highlighted asset.ID field returned from the service is not a required
field when downloading uploaded artifacts from the GH API, so it is not saved. In the download path for GH files, the download pathways "ID" is the backend server DB ID assigned to this firmware record, it is not the same ID as the origional asset.ID identified. 

The recommendation for adding tests for Github and GLG firmware updates exist in smoke tests, where gateway devices repeatedly connecte and download firmware files from both GLG and GH endpoints to ensure download pathways are up and functional (https://github.com/RxFunction/walkasins-gateway-server-smoketests)

## Uncertain concerns requiring manual validation

### Concern ID: UC-01
Title: Upstream infrastructure may normalize or overwrite `useremail`
Relevant files/functions:
- `middleware/input.middleware.js:reqCookie()`
- `middleware/authtoken.middleware.js:verify()`
Evidence code paths:
- `middleware/input.middleware.js:reqCookie()` at lines 28-32
- `middleware/authtoken.middleware.js:verify()` at lines 28-53
Why it remains uncertain:
The repository shows that the backend trusts `useremail`, but it does not include ingress, reverse-proxy, or identity-gateway configuration that may rewrite or block client-supplied values before requests reach the app.
What must be validated manually:
- Whether the deployed ingress/proxy injects `useremail` from a trusted identity source
- Whether direct client control of `useremail` is blocked in production
- Whether the trust boundary is documented as an external security dependency
Source review artifact(s):
- `06_initial_architecture_attack_surface_analysis.md`
- `07_authorization_access_control_review.md`

### Concern ID: UC-01 Engineer review
Addressed in "Finding ID: CF-01 Engineer review" topic

### Concern ID: UC-02
Title: Production seeding may prevent exposure of the first-user-admin bootstrap path
Relevant files/functions:
- `middleware/authtoken.middleware.js:verify()`
- `services/user.service.js:createUser()`
Evidence code paths:
- `middleware/authtoken.middleware.js:verify()` at lines 41-46
- `services/user.service.js:createUser()` at lines 69-90
Why it remains uncertain:
The bootstrap behavior is code-backed, but the review did not include deployment seed scripts, migration procedures, or production database state.
What must be validated manually:
- Whether production always pre-creates users/groups before service exposure
- Whether operational reset/migration procedures can recreate an empty-user condition
- Whether bootstrap behavior is intentionally relied upon anywhere
Source review artifact(s):
- `06_initial_architecture_attack_surface_analysis.md`
- `07_authorization_access_control_review.md`

### Concern ID: UC-02 Engineer review
Addressed in "Finding ID: CF-02 Engineer review" topic

### Concern ID: UC-03
Title: Effective publisher set for trusted inbound device messages depends on AWS IoT policy outside the repository
Relevant files/functions:
- `services/aws.sqs.service.js:processMessage()`
- `routes/mqtt.route.js:process()`
- `middleware/mqtt-input.middleware.js`
Evidence code paths:
- `services/aws.sqs.service.js:processMessage()` at lines 77-90
- `routes/mqtt.route.js:process()` at lines 14-27
- `middleware/mqtt-input.middleware.js:reqDataResp` at lines 25-29
Why it remains uncertain:
The reviewed code processes messages that arrive through the subscribed SQS/MQTT path, but the repository does not include the AWS IoT certificates, topic policies, or subscription policy that define who can publish them.
What must be validated manually:
- Which principals can publish `gateway/send/cbor` traffic in production
- Whether per-device topic restrictions are enforced
- Whether compromised or test credentials could reach the same ingestion path
Source review artifact(s):
- `06_initial_architecture_attack_surface_analysis.md`
- `08_inbound_device_message_trust_boundary_review.md`

### Concern ID: UC-03 Engineer review
Addressed in "Finding ID: CF-04 Engineer review" topic

### Concern ID: UC-04
Title: Device-side firmware verification may exist outside the reviewed backend
Relevant files/functions:
- `controllers/system.controller.js:processSystemGetFirmware()`
- `controllers/system.controller.js:processSystemGetFWManifest()`
- `services/aws.athena.service.js:getEphemeralURL()`
Evidence code paths:
- `controllers/system.controller.js:processSystemGetFirmware()` at lines 270-280
- `controllers/system.controller.js:processSystemGetFWManifest()` at lines 259-267
- `services/aws.athena.service.js:getEphemeralURL()` at lines 81-93
Why it remains uncertain:
The backend does not verify firmware integrity before serving, but the repository does not include the device-side OTA client that may perform signature or hash validation after download.
What must be validated manually:
- Whether the gateway/device validates firmware signatures or digests before install
- Whether manifest contents include expected integrity metadata consumed by the device
- Whether backend and device controls are designed to operate together
Source review artifact(s):
- `09_firmware_manifest_file_delivery_ota_review.md`

### Concern ID: UC-04 Engineer review
Addressed in "Finding ID: CF-05 Engineer review" topic

### Concern ID: UC-05
Title: The downstream impact of arbitrary metric fields cannot be determined from this repository alone
Relevant files/functions:
- `middleware/mqtt-input.middleware.js:reqMetrics`
- `controllers/system.controller.js:storeSystemMetrics()`
- `services/system.service.js:storeSystemMetrics()`
- `model/w200/system-metrics-template.js`
Evidence code paths:
- `middleware/mqtt-input.middleware.js:reqMetrics` at lines 17-19
- `controllers/system.controller.js:storeSystemMetrics()` at lines 159-167
- `model/w200/system-metrics-template.js` at lines 9-12
Why it remains uncertain:
The backend accepts arbitrary metric object fields, but the repository does not show all downstream consumers, reports, dashboards, or automation that may rely on those fields.
What must be validated manually:
- Which systems read from `SystemMetrics`
- Whether any downstream logic assumes trusted schema or uses these fields in sensitive workflows
- Whether additional validation or schema constraints are needed for production consumers
Source review artifact(s):
- `08_inbound_device_message_trust_boundary_review.md`

### Concern ID: UC-05 Engineer review
Metric fields are not determined at this time, and as such these areas are WIP and will be defined at a later time. When they are, proper input sanitation and leveraging existing security controls will be essential to prevent possible security issues.  No action at this time, queued for follow up review at a later time.

## Reviewed areas with no confirmed issue identified

### Review area: API-key-protected provisioning and dirty-system processing
Files/functions examined:
- `routes/api.route.js`
- `middleware/authtoken.middleware.js:verifyAPIKey()`
- `controllers/api.controller.js:provisionSystem()`
- `controllers/api.controller.js:processDirtySystems()`
Conclusion:
The reviewed API routes are separated from the manager user/group authorization model and are protected by an API-key lookup path. No additional confirmed issue was identified in this review beyond the limitations noted elsewhere.

### Review area: User-group permission hierarchy adjustment
Files/functions examined:
- `services/user.service.js:getAllPermissions()`
- `services/user.service.js:editUserGroup()`
- `services/user.service.js:adjustArray()`
- `services/user.service.js:filterHighestPermission()`
Conclusion:
The reviewed code attempts to preserve permission hierarchy by expanding requested add/remove operations using permission levels from the global permissions document. No confirmed defect was identified in that logic during this static pass.

### Review area: Shell command routes requiring stronger permissions
Files/functions examined:
- `routes/system.route.js:/shellCommand`
- `routes/system.route.js:/observeShell`
- `controllers/system.controller.js:sendShellCommand()`
- `controllers/system.controller.js:observeSystemShell()`
Conclusion:
Unlike several other system-management routes, the shell command surfaces are protected by `SYSTEM:control`. No additional confirmed issue was identified in permission classification for these routes.

### Review area: Dirty-flag and IoT shadow update orchestration
Files/functions examined:
- `controllers/api.controller.js:processDirtySystems()`
- `services/system.service.js:getDirtySystems()`
- `services/system.service.js:createStateRecord()`
- `services/aws.iot.service.js:updateShadowPropertyForDevice()`
Conclusion:
The reviewed shadow-update flow is driven from database-backed system, device, and fleet state rather than directly from inbound device payloads. No separate confirmed issue was identified in that orchestration path beyond the manifest/file-delivery findings already listed.

### Review area: Presigned S3 URL delivery lifetime
Files/functions examined:
- `controllers/system.controller.js:processSystemDataRequest()`
- `services/aws.athena.service.js:getEphemeralURL()`
- `services/aws.athena.service.js:getS3DataExpiry()`
- `services/aws.athena.service.js:resetS3Expiration()`
Conclusion:
The reviewed implementation issues short-lived presigned URLs and refreshes cached object lifetime when required. No additional confirmed issue was identified in URL lifetime handling from static review alone.

## Static-analysis limitations
- Review was limited to repository source code and did not include runtime configuration, AWS policies, ingress settings, database seed state, or live external integrations.
- No dynamic testing was performed against the manager app, API app, IoT message flow, GitHub/GLG integrations, or S3 delivery.
- Device-side code consuming manifests and firmware binaries was out of scope because it is not present in this repository.

## Recommended follow-up actions
1. Validate the deployed manager authentication trust boundary, including how identity is bound to `sessID` and whether client-supplied `useremail` is blocked, rewritten, or otherwise controlled upstream. This follow-up is directly relevant to `CF-01` and `UC-01`.
2. Remove implicit first-user bootstrap from the runtime authorization path or constrain it to a controlled provisioning mechanism. Confirm operational seeding and reset procedures in relation to `CF-02` and `UC-02`.
3. Reclassify write-capable manager routes so they require non-view permissions, then review deployed role mappings and add regression tests for permission enforcement. This follow-up addresses `CF-03`.
4. Add gateway-to-system/fleet entitlement checks to the inbound `data` request path and test negative cases for off-fleet firmware and manifest requests. This follow-up addresses `CF-04` and `UC-03`.
5. Add end-to-end firmware integrity controls, including persisted expected digests or signatures and verification before S3 caching and device delivery. Confirm whether device-side verification already exists. This follow-up addresses `CF-05` and `UC-04`.
6. Correct the GitHub OTA metadata/download mismatch, test the GitHub-backed path end to end, and assess impact on already stored GitHub firmware entries. This follow-up addresses `CF-06`.
7. Review all downstream consumers of `SystemMetrics` and determine whether the current flexible schema is acceptable or requires tighter validation. This follow-up addresses `UC-05`.
