"use strict";
const userService = require("../services/user.service");
const { StatusCodes } = require("http-status-codes");
const appVersion = require("../package.json").version;
const logger = require("../logger");

async function getLoginInfo(req, res, next) {
    try {
		logger.info("user getting login info");
		const roles = await userService.getUserPermissions(res.locals.user, true);
		res.status(StatusCodes.OK).json({
			name: res.locals.user,
			roles: roles
		});
    } catch (err) {
        logger.error(`Error getting login info ${err.message}`);
        next(err);
    }
}

async function getVersion(req, res) {
	logger.info(`user requesting API version: ${appVersion}`);
	res.status(StatusCodes.OK).json({
		message: appVersion
	});
}


module.exports = {
	getVersion,
    getLoginInfo,
};
