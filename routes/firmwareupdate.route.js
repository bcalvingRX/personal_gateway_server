"use strict";
const express = require("express");
const router = express.Router();
const fwManagementController = require("../controllers/fwupdatemanagement.controller");
const auth = require( "../middleware/authtoken.middleware.js");
const paramMid = require( "../middleware/input.middleware.js");

//*********FIRMWARE MANAGEMENT*********

//GET - Fleet details
router.get("/firmware",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamGetFirmware()],
	fwManagementController.getFirmware);

router.post("/firmware",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamPostFirmware()],
	fwManagementController.saveFirmware);

router.get("/firmwareCount",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamGetFirmwareCount()],
	fwManagementController.getNumberFirmware);

//GET - Groups
router.get("/groups",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamGetGroups()],
	fwManagementController.getGroups);

router.post("/group",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamPostGroup()],
	fwManagementController.saveGroup);

router.get("/groupCount",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamGetGroupCount()],
	fwManagementController.getNumberGroups);

router.get("/fleetDetails",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamGetFleet()],
	fwManagementController.getFleet);

//GET - Get a list of fleets
router.get("/fleets",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamGetFleets()],
	fwManagementController.getFleets);

router.post("/fleet",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamPostFleet()],
	fwManagementController.saveFleet);

router.post("/modify",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW), paramMid.reqFWParamModifyFleets()],
	fwManagementController.modifyFleet);

// GET - get number of fleets
router.get("/fleetCount",
	[paramMid.reqCookie(), auth.verify(auth.LOC.SYSTEM, auth.PERM.VIEW)],
	fwManagementController.getNumberFleets);

module.exports = router;
