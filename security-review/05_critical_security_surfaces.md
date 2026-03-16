# Critical Security Assessment

## Purpose
Summarize the most important security-relevant observations from discovery without overstating unsupported conclusions.

## Confirmed code-backed concerns
1. Manager authorization depends on request-derived identity fields.
   - `reqCookie()` requires `useremail` header and a non-empty `sessID` cookie, then `auth.verify()` authorizes using `res.locals.data.useremail`.
   - Discovery implication:
     - manager identity trust is a primary security property for later focused review.

2. Runtime first-user bootstrap is built into the authorization path.
   - `auth.verify()` calls `userService.createUser(email)`, and `createUser()` assigns `Admin Group` when the user collection is empty.
   - Discovery implication:
     - bootstrap and seed-state handling are security-sensitive operational assumptions.

3. Several write-capable manager routes use `SYSTEM:view`.
   - observed on `routes/system.route.js` and `routes/firmwareupdate.route.js`
   - Discovery implication:
     - route permission classification requires focused review rather than assumption.

4. Inbound device `data` requests reach firmware and manifest delivery handlers.
   - `routes/mqtt.route.js` dispatches `data` to `processSystemGetFile()`
   - downstream logic serves firmware by `firmware_id` and manifests by `state_hash`
   - Discovery implication:
     - the inbound message boundary includes privileged OTA retrieval behavior.

5. OTA delivery uses upstream discovery plus S3 caching, but backend integrity verification is not visible in discovery paths.
   - firmware existence checks are visible for GitHub and GLG
   - state-record hashing is over identifier tuples, not file contents
   - Discovery implication:
     - OTA integrity is a top review area.

## Likely high-risk areas needing focused review
1. Manager authorization and identity-source trust
   - because the same path governs user/group administration, system control, and firmware management

2. Inbound message processing from AWS IoT/SQS into controller handlers
   - because external input reaches persistence, Redis pub/sub, and file-delivery logic

3. Firmware/fleet management and dirty-system propagation
   - because backend state changes later influence device-visible update behavior

4. Shell command publication to systems
   - because this is a direct remote-control capability

5. Presigned URL generation and OTA file mediation
   - because the backend is an active part of the file-delivery control path

## Unknowns requiring runtime, cloud, hardware, or deployment validation
1. Whether ingress or proxy infrastructure rewrites or validates `useremail`
2. Whether production seed state prevents exposure of the first-user-admin path
3. Which principals can publish trusted inbound device messages through AWS IoT/SQS
4. Whether devices verify firmware signatures or digests before installation
5. What S3 bucket policy, lifecycle, encryption, and audit controls are enforced in deployment

## Discovery conclusion
The repository exposes a meaningful security review surface across manager authorization, backend automation, inbound device message handling, and OTA orchestration. Discovery produced enough code-backed evidence to justify focused review of authorization, inbound device trust boundaries, and firmware/OTA delivery next.
