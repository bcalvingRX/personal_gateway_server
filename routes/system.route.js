"use strict";
const express = require("express");
const router = express.Router();
const systemController = require("../controllers/system.controller");
const auth = require( "../middleware/authtoken.middleware.js");
const paramMid = require( "../middleware/input.middleware.js");

//*********SYSTEM and DEVICE OPERATIONS*********

// GET - list of systems
router.get("/",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqGetSystems()],
	systemController.getSystems);

// GET - number of systems present
router.get("/amount",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqGetNumSystems()],
	systemController.getNumSystems);

// GET - get details on a specific system
router.get("/details",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqSystemDetails()],
	systemController.getSystem);

// GET - get metrics reported on a specific system
router.get("/metrics",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqSystemMetrics()],
	systemController.getSystemMetrics);

// POST - modify the systems assigned fleet
router.post("/setFleet",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqPostSystemFleet()],
	systemController.setFleet);

// GET - get details on a specific device
router.get("/device_details",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqDeviceDetails()],
	systemController.getDevice);

// POST - modify the enrolled devices in a system
router.post("/modify",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqModifySystem()],
	systemController.modifySystem);

// POST - send a generic command to a system over an open shell session
router.post("/shellCommand",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.CONTROL), paramMid.reqSystemShellCommand()],
	systemController.sendShellCommand);

// POST - open shell stream on a system
router.post("/observeShell",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.CONTROL)],
	systemController.observeSystemShell);

// GET - get SIM/Cellular details for a system
router.get("/sim",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqSystemSIMDetails()],
	systemController.getSystemSIMDetails);

module.exports = router;
