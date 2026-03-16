# External Integration Inventory

## AWS IoT
- Files:
  - `services/aws.iot.service.js`
  - `controllers/system.controller.js`
  - `controllers/api.controller.js`
- Purpose:
  - get/update thing shadow
  - publish commands and file-delivery URLs to devices
- Security relevance:
  - outbound control channel
  - trust in thing identity and topic authorization

## AWS SQS
- Files:
  - `services/aws.sqs.service.js`
  - `index.js`
- Purpose:
  - receive subscribed inbound messages for MQTT-style processing
- Security relevance:
  - ingress path for device/backend messages

## AWS S3
- Files:
  - `services/aws.athena.service.js`
  - `controllers/system.controller.js`
- Purpose:
  - cache firmware/manifests/random data
  - generate presigned URLs
- Security relevance:
  - OTA delivery path
  - object lifetime and URL issuance

## GitHub API
- Files:
  - `services/github.service.js`
  - `controllers/fwupdatemanagement.controller.js`
- Purpose:
  - discover and download firmware release assets
- Security relevance:
  - external firmware source trust

## Green Light Guru API
- Files:
  - `services/greenlightguru.service.js`
  - `controllers/fwupdatemanagement.controller.js`
- Purpose:
  - discover and download firmware revisions
- Security relevance:
  - external firmware source trust

## Simbase API
- Files:
  - `services/simbase.service.js`
  - `controllers/system.controller.js`
- Purpose:
  - retrieve SIM details for systems
- Security relevance:
  - external data exposure path, though not a primary privileged flow
