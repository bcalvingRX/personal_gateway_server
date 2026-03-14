# Inbound Messaging Control Plane

## Plain English Description

This document explains how messages from devices enter the gateway server and are processed.

Devices communicate with the gateway primarily through MQTT topics. The gateway subscribes to specific inbound topics and receives messages sent by devices or other backend components.

These inbound messages are validated, parsed, and routed to internal handlers that perform operations such as:

- processing system responses
- updating system metrics
- updating device logs
- handling state changes

This path is security-relevant because it represents a **device-to-server trust boundary**.

If inbound messages are not properly validated, a compromised device or malicious publisher could influence backend state.

---

## Entry Point

Route file: `routes/mqtt.route.js`

Endpoint:

`POST /api/mqtt`

Purpose:

Receives MQTT messages that have been forwarded into the gateway server.

These messages typically originate from the AWS IoT message pipeline.

---

## Validation

File: `middleware/mqtt-input.middleware.js`

This middleware performs validation on inbound MQTT messages.

Observed behavior:

- validates message structure
- parses topic and message payload
- ensures required message fields are present
- extracts validated fields into `res.locals.data`

This step ensures controller logic works only with sanitized message content.

---

## Authorization Model

Inbound MQTT messages do **not use manager session authorization**.

Instead they rely on:

- AWS IoT authentication
- certificate-based device identity
- topic-based access control

This means the trust boundary occurs **before the gateway server**, at the MQTT broker layer.

The gateway assumes messages arriving at this route are already authenticated by the broker.

---

## Controller Behavior

File: `controllers/api.controller.js`

Function: `processMQTTMessage()`

Behavior:

1. reads parsed message data from `res.locals.data`
2. extracts device or system identifier
3. determines message type
4. routes message to the appropriate service handler

This routing determines which internal subsystem processes the inbound event.

---

## Message Types

Based on code structure, inbound messages may include:

- system state updates
- device metrics
- firmware update responses
- system command responses
- log entries

The controller uses the message type or topic to determine the handler.

---

## Internal Processing Path

After controller routing, processing may involve:

services/system.service.js  
services/report.service.js  
services/redis.service.js  

These services update backend state or publish internal events.

---

## External Boundaries

Inbound MQTT messages originate from:

devices  
AWS IoT message broker  
backend automation systems

Trust assumptions include:

- device certificates
- broker topic authorization
- controlled publishing permissions

The gateway server itself does not perform certificate validation.

---

## Positive Controls

- dedicated MQTT input validation middleware
- centralized parsing of inbound message payloads
- validated message data stored in `res.locals.data`
- separation between inbound messaging and manager APIs

---

## Security-Relevant Observations

1. MQTT inbound messages represent a major device-to-server trust boundary.
2. Authentication relies on AWS IoT broker configuration.
3. Gateway validation focuses on message structure, not identity.
4. Controller logic routes inbound messages to multiple internal subsystems.
5. Improper validation could allow malicious payloads to influence backend state.

---

## Follow-Up Questions

These are not findings yet.

1. What exact topic patterns are accepted for inbound messages?
2. Are message payload schemas strictly validated?
3. Are device identifiers verified against registered systems?
4. Can inbound messages trigger system control paths?
5. How are malformed or unexpected message types handled?

---

## Next Review Targets

1. `middleware/mqtt-input.middleware.js`
2. `controllers/api.controller.js`
3. `services/system.service.js`
4. `services/report.service.js`
5. MQTT topic authorization rules