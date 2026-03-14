"use strict";
const express = require("express");
const router = express.Router();
const apiController = require("../controllers/api.controller");
const auth = require( "../middleware/authtoken.middleware.js");
const paramMid = require( "../middleware/input.middleware.js");

router.post("/provisionSystem",
	[paramMid.reqRegToken(), auth.verifyAPIKey, paramMid.reqProvisionSystem()],
	apiController.provisionSystem);

router.get("/processDirtySystems",
	[paramMid.reqRegToken(), auth.verifyAPIKey],
	apiController.processDirtySystems);

module.exports = router;
