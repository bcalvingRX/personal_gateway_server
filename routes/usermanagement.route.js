"use strict";
const express = require("express");
const router = express.Router();
const userController = require("../controllers/usermanagement.controller");
const auth = require( "../middleware/authtoken.middleware.js");
const paramMid = require( "../middleware/input.middleware.js");

// GET - get users
router.get("/users",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR, auth.PERM.VIEW), paramMid.reqUMParamGetUsrs()],
	userController.getUsers);

// GET - get number of users
router.get("/userCount",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR, auth.PERM.VIEW)],
	userController.getNumberUsers);

// POST - edit an existing user
router.post("/editUser",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR_GRP, auth.PERM.APPLY), paramMid.reqUMParamEditUsr()],
	userController.setUserGroup);

// GET - get permissions
router.get("/userPermissions",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR_GRP, auth.PERM.VIEW)],
	userController.getPermissions);

// GET - get user groups
router.get("/userGroups",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR_GRP, auth.PERM.VIEW)],
	userController.getUserGroups);

// GET - get number of user groups
router.get("/userGroupCount",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR_GRP, auth.PERM.VIEW)],
	userController.getNumberUserGroups);

// POST - create a new user group
router.post("/createUserGroup",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR_GRP, auth.PERM.ADD), paramMid.reqUMParamCreateUsrGrp()],
	userController.createUserGroup);

// POST - edit an existing user group
router.post("/editUserGroup",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR_GRP, auth.PERM.EDIT), paramMid.reqUMParamEditUsrGrp()],
	userController.editUserGroup);

// DELETE - delete a user group
router.delete("/userGroup",
	[paramMid.reqCookie(), auth.verify(auth.LOC.USR_GRP, auth.PERM.DELETE), paramMid.reqUMParamDeleteUsrGrp()],
	userController.deleteUserGroup);

module.exports = router;
