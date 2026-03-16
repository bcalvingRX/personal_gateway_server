# Firmware Manifest, File Delivery, and OTA Orchestration Review

## Scope reviewed
- Firmware catalog creation and storage.
- Fleet targeting and dirty-flag orchestration.
- Manifest generation and lookup.
- Firmware binary retrieval from GitHub and GLG, S3 caching, and presigned-URL delivery.

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
- `middleware/input.middleware.js`

## Traced code paths
- Firmware registration:
  - `routes/firmwareupdate.route.js:/firmware` -> `input.middleware.js:reqFWParamPostFirmware()` -> `fwupdatemanagement.controller.js:saveFirmware()` -> `github.service.js:checkFirmwareExists()` or `greenlightguru.service.js:checkFirmwareExists()` -> `system.service.js:saveFirmware()`
- Fleet targeting changes:
  - `routes/firmwareupdate.route.js:/modify` -> `fwupdatemanagement.controller.js:modifyFleet()` -> `system.service.js:modifyFleetEntry()/setDirtyBitForFleet()`
- Dirty-system manifest generation:
  - `routes/api.route.js:/processDirtySystems` -> `api.controller.js:processDirtySystems()/processSystem()` -> `system.service.js:createStateRecord()` -> `aws.iot.service.js:updateShadowPropertyForDevice()`
- Device file retrieval:
  - inbound `data` command -> `system.controller.js:processSystemGetFile()` -> `processSystemGetFirmware()` or `processSystemGetFWManifest()` -> S3 cache/presigned URL -> `aws.iot.service.js:publishMessageToDevice()`

## OTA orchestration observations
- Firmware records store metadata about source, file, and either GLG revision or GitHub org/repo/tag.
- Fleet manifests are not separate signed documents; they are `StateRecord` entries keyed by a MurmurHash of fleet-group identifier tuples.
- The server uses S3 as a temporary file cache and hands devices presigned URLs rather than proxying the binary inline.
- A fleet change sets `dirty_flag` on affected systems; `/api/processDirtySystems` recomputes device and fleet hashes and writes them to the AWS IoT shadow fields `DH` and `FH`.

## Confirmed findings
1. Firmware binaries are served without backend integrity verification of the downloaded content.
   - Evidence:
   - Firmware registration only checks existence upstream (`checkFirmwareExists()`).
   - Firmware delivery downloads bytes from GitHub or GLG and uploads them to S3.
   - No reviewed path computes or verifies a cryptographic digest or signature for the binary before it is cached and served.
   - `createStateRecord()` hashes only concatenated identifiers using MurmurHash; it does not hash firmware file contents.
   - Security effect:
   - The backend trusts upstream content and transport success, but it does not independently verify binary integrity before OTA delivery.
2. GitHub-backed OTA download flow is internally inconsistent and appears unable to fetch the intended asset by ID.
   - Evidence:
   - `github.service.js:checkFirmwareExists()` returns a GitHub release asset ID.
   - `fwupdatemanagement.controller.js:saveFirmware()` does not persist that asset ID; it stores only `org`, `repo`, `tag`, and `file`.
   - `system.controller.js:processSystemGetFirmware()` later calls `github.service.js:downloadFirmwareRevision(firmwareInfo.org, firmwareInfo.repo, firmwareInfo.tag, firmwareInfo.file)`.
   - `github.service.js:downloadFirmwareRevision()` accepts a single `id` parameter and constructs the download URL from that value.
   - Security effect:
   - GitHub OTA delivery is likely broken or misdirected for registered firmware, which reduces confidence in patch/update availability for GitHub-sourced builds.
3. Device firmware and manifest retrieval is identifier-based rather than entitlement-based.
   - Evidence:
   - `processSystemGetFile()` resolves firmware by requested `firmware_id` and manifest by requested `state_hash`.
   - No device-to-fleet authorization check is performed before returning the presigned URL.
   - Security effect:
   - Known firmware IDs or manifest hashes are sufficient to trigger delivery through the trusted device channel.

## Uncertain concerns requiring manual validation
- Device-side validation may independently verify firmware signatures or hashes after download; that logic is not in this repository.
- S3 lifecycle, bucket policy, and server-side encryption posture were not available for review.
- Rollback visibility may exist in external monitoring, audit, or change-management tooling outside this backend.

## Reviewed areas with no confirmed issue identified
- Fleet modifications set dirty flags so system shadows are recomputed before the next device sync.
- Firmware registration prevents duplicate firmware IDs and duplicate source/file identity entries for the same upstream record.
- Presigned URLs are intentionally short-lived once generated, while the cached S3 object lifetime is refreshed when necessary.

## Limitations
- Static review only; no live GitHub/GLG credentials, S3 bucket configuration, or IoT shadow contents were available.
- No runtime verification was performed to confirm the GitHub path failure against a live release.
- No rollback workflow or operator runbook artifacts were present in the reviewed code.

## Recommended follow-up review targets
- Device-side OTA client validation of binaries and manifests.
- GitHub OTA integration testing with live release assets.
- S3 bucket policy, lifecycle, and encryption configuration.
- Audit logging or operator workflows for tracking rollback, failed updates, and staged deployments.
