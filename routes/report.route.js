"use strict";
const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const auth = require( "../middleware/authtoken.middleware.js");
const paramMid = require( "../middleware/input.middleware.js");

// GET - get report templates
router.get("/get",
	[paramMid.reqCookie(), auth.verify(auth.LOC.REPORT, auth.PERM.VIEW)],
	reportController.get);

// POST - create a new report template
router.post("/create",
	[paramMid.reqCookie(), auth.verify(auth.LOC.REPORT, auth.PERM.ADD), paramMid.reqRPCreateTemplate()],
	reportController.save);

// POST - create a new report template
router.post("/update",
	[paramMid.reqCookie(), auth.verify(auth.LOC.REPORT, auth.PERM.EDIT), paramMid.reqRPUpdateTemplate()],
	reportController.update);

// DELETE - delete an existing report template
router.delete("/delete",
	[paramMid.reqCookie(), auth.verify(auth.LOC.REPORT, auth.PERM.DELETE), paramMid.reqRPDeleteTemplate()],
	reportController.deleteTemplate);


module.exports = router;
