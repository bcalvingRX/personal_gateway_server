# Firmware Manifest, File Delivery, and OTA Review

## Scope reviewed
- firmware metadata registration and storage
- group and fleet targeting updates
- dirty-flag propagation into synchronization state
- manifest lookup, external firmware retrieval, S3 caching, and presigned URL delivery

## Discovery inputs used
- `security-review/02_trust_boundaries.md`
- `security-review/04_gateway_architecture_overview.md`
- `security-review/05_critical_security_surfaces.md`
- `security-review/evidence/update_flow_inventory.md`
- `security-review/evidence/privileged_operations_inventory.md`
- `security-review/evidence/cross_component_security_paths.md`
- `security-review/code-paths/firmware_update_management_path.md`
- `security-review/code-paths/dirty_system_processing_path.md`

## Files/functions examined
- `routes/firmwareupdate.route.js`
- `controllers/fwupdatemanagement.controller.js`
- `controllers/system.controller.js`
- `controllers/api.controller.js`
- `services/system.service.js`
- `services/github.service.js`
- `services/greenlightguru.service.js`
- `services/aws.athena.service.js`
- `services/aws.iot.service.js`
- `model/w200/firmware-template.js`
- `model/w200/fleet-template.js`
- `model/w200/state-record-template.js`

## Traced code paths
- firmware registration:
  - `/api/fw/firmware` -> `saveFirmware()` -> external source existence check -> `systemService.saveFirmware()`
- fleet targeting modification:
  - `/api/fw/modify` -> `modifyFleet()` -> `modifyFleetEntry()` -> `setDirtyBitForFleet()`
- dirty-system synchronization:
  - `/api/processDirtySystems` -> `processSystem()` -> `createStateRecord()` -> `updateShadowPropertyForDevice()`
- device retrieval:
  - inbound `data` command -> `processSystemGetFile()` -> external download or manifest lookup -> S3 upload/cache -> presigned URL -> device publish-back

## Confirmed findings
1. Backend OTA delivery does not include a visible cryptographic integrity verification step for downloaded firmware binaries.
   - Evidence:
     - firmware registration checks source existence
     - retrieval path downloads bytes and uploads them to S3 for delivery
     - `createStateRecord()` hashes identifier tuples, not firmware contents
2. GitHub-backed OTA retrieval is internally inconsistent with the metadata stored during firmware registration.
   - Evidence:
     - GitHub existence check returns an asset ID
     - stored GitHub firmware metadata retains `org`, `repo`, `tag`, and `file`, but no asset ID
     - later download path calls `downloadFirmwareRevision()` with metadata fields rather than a stored asset ID
3. Device firmware and manifest retrieval is identifier-based rather than entitlement-based.
   - Evidence:
     - inbound `data` path resolves artifacts by identifier and returns presigned URLs without a reviewed device/fleet authorization check

## Uncertain concerns requiring manual validation
- whether device-side OTA logic verifies signatures or digests before install
- what S3 bucket protections exist in deployment
- what rollback, staged rollout, and operator audit workflows exist outside this backend

## Limitations
- no live GitHub, GLG, S3, or AWS IoT execution was performed
- device-side OTA client behavior is out of scope for this repository
- runtime evidence about stored firmware records and deployed fleets was not available

## Recommended follow-up review targets
- live validation of the GitHub OTA path
- deployment review of S3 bucket controls and OTA audit logging
- device-side verification and install-flow review
