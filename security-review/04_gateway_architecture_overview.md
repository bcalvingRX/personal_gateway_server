# Gateway Architecture Overview

## Plain English Description

This document summarizes the architecture of the walkasins-gateway-server based on code review.

The gateway server sits between several different actors:

- Manager web application (administrative UI)
- Backend automation systems
- AWS IoT infrastructure
- Connected gateway devices and their peripherals
- Internal state storage (MongoDB, Redis)

The server acts as both:

1. **Control plane for managers**
   - issuing commands
   - managing firmware
   - managing fleets and groups

2. **Synchronization bridge**
   - translating backend state into device-facing updates
   - receiving device/backend messages

---

# High-Level Architecture

Manager UI
↓  
Manager API (session auth)

Backend Automation
↓  
API routes (API key auth)

Gateway Server
↓  
Device Messaging Layer (AWS IoT)

Devices / Gateway Hardware

---

# Major Components

## 1. Manager Application API

Files:

- apps/manager-app.js
- routes/system.route.js
- routes/firmwareupdate.route.js
- routes/usermanagement.route.js
- controllers/system.controller.js
- controllers/fwupdatemanagement.controller.js

Responsibilities:

- system control commands
- firmware management
- fleet and group management
- user administration
- shell commands

Security controls:

- session cookie validation
- user permission checks
- role/group permission model

---

## 2. Public / Automation API

Files:

- apps/api-app.js
- routes/api.route.js
- controllers/api.controller.js

Responsibilities:

- provisioning systems
- device registration
- dirty-system processing
- backend automation hooks

Security controls:

- API key authentication
- request validation middleware

---

## 3. Firmware and Fleet Management

Files:

- controllers/fwupdatemanagement.controller.js
- services/system.service.js
- model/w200/*

Responsibilities:

- firmware metadata storage
- group definitions
- fleet definitions
- firmware-to-group assignment

These changes update backend state and mark systems as **dirty**.

Dirty systems are later processed into device update signals.

---

## 4. Dirty System Processing

Files:

- controllers/api.controller.js
- services/system.service.js

Responsibilities:

- detect systems marked dirty
- generate state hashes representing:
  - device state
  - firmware group state
- publish these hashes to AWS IoT thing shadow desired properties

These hashes act as synchronization signals to gateway devices.

---

## 5. Device Messaging Layer

Files:

- routes/mqtt.route.js
- services/aws.iot.service.js
- services/aws.sqs.service.js

Responsibilities:

- publish commands to devices
- receive backend/device messages
- interact with AWS IoT shadow state

This layer forms the **device communication boundary**.

---

## 6. Redis Event Bus

Files:

- services/redis.service.js

Responsibilities:

- internal pub/sub
- shell response streaming
- asynchronous state propagation

Redis acts as an internal messaging bus for real-time events.

---

## 7. Database Layer

Files:

- services/database.service.js
- model/w200/*
- model/user*

Responsibilities:

- firmware records
- device records
- fleet and group state
- user accounts and permissions

MongoDB appears to store the persistent system state.

---

# Key Trust Boundaries

1. Manager UI → Gateway Server
   - authenticated user session
   - permission enforcement

2. Automation Systems → API Routes
   - API key authentication

3. Gateway Server → AWS IoT
   - device command publishing
   - shadow state updates

4. AWS IoT → Devices
   - device control plane

5. Device Messages → Gateway Server
   - inbound MQTT/SQS processing

6. Gateway Server → Internal State
   - Redis event bus
   - MongoDB storage

---

# Command and Update Flow

## Manager Control Flow

Manager user  
→ Manager API route  
→ Permission validation  
→ Controller action  
→ AWS IoT publish  
→ Device receives command

Example:

POST /api/system/shellCommand


---

## Firmware Update Flow

Manager modifies fleet or firmware  
→ Backend state updated  
→ Systems marked dirty  
→ Dirty-system processor runs  
→ Device and fleet hashes generated  
→ AWS IoT shadow desired state updated  
→ Gateway device reacts

---

## Device Sync Flow

Backend state changes  
→ Hash updates pushed to device shadow  
→ Gateway device compares hashes  
→ Device fetches updated manifest if needed

---

# Observed Security Model

Authentication types:

- Manager session cookies
- API key authentication
- TLS certificate validation for instruments

Authorization model:

- user → group → permissions
- permissions cached in Redis

Validation model:

- centralized express-validator middleware
- sanitized values passed through `res.locals.data`

---

# Architecture Summary

The gateway server acts as a central control and synchronization node between:

- management interfaces
- backend automation
- AWS IoT messaging
- deployed gateway systems

Key operational behaviors:

- manager commands publish directly to devices
- firmware updates modify backend state first
- dirty-system processing synchronizes state to devices
- inbound messaging likely completes the device communication loop

The next review phase focuses on the **inbound messaging control plane** to complete the architecture trace.

