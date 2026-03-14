"use strict";
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authentication.controller");
const auth = require( "../middleware/authtoken.middleware.js");
const paramMid = require( "../middleware/input.middleware.js");

// GET - API version
router.get("/version",
    [paramMid.reqCookie(), auth.verify(auth.LOC.BASE, auth.PERM.BASE)],
    authController.getVersion);

// POST - login user
router.get("/getLoginInfo", [paramMid.reqCookie(), auth.verify(auth.LOC.BASE, auth.PERM.BASE)], authController.getLoginInfo);

module.exports = router;
