"use strict";
const { StatusCodes } = require("http-status-codes");
const userService = require("../services/user.service");
const logger = require("../logger");

const LOC = {
    BASE: "Login",
    USR_GRP: "UserGroups",
    USR: "Users",
    REPORT: "ReportTemplates",
    RTRN_RCRD: "ReturnRecords",
    SYSTEM: "Systems",
    GLG_FW: "GLG_HM_Firmware",
    GH_FW: "GH_HM_Firmware"
};

const PERM = {
    BASE: "Login",
    VIEW: "view",
    APPLY: "apply",
    CONTROL: "control",
    MANAGE: "manage",
    ADD: "add",
    DELETE: "delete",
    EDIT: "edit"
};

function verify(loc, per) {
    return async function verifyUser(req, res, next) {
        var email = res.locals.data?.useremail;
        try {
            if (email === undefined && process.env.NODE_ENV === "development") {
                email = "test.admin1@rxfunction.com";
            }

            if (!email) {
                logger.warn("No authenticated user email found in headers");
                return res.status(StatusCodes.UNAUTHORIZED).send({ message: "Authentication required" });
            }

            //try to create in case we dont have a profile for them
            await userService.createUser(email);

            logger.info(`Authorizing user: ${loc} -- ${per}`);

            const permissions = await userService.getUserPermissions(email, false);
            const permissionGranted = (loc === LOC.BASE && per === PERM.BASE) ||
                permissions.some(perm => perm.location === loc && perm.name === per);

            if (permissionGranted) {
                logger.info(`Permission granted for user: ${email}`);
                res.locals.user = email;
                return next();
            } else {
                logger.warn(`Permission denied for user: ${email}, location: ${loc}, permission: ${per}`);
                return res.status(StatusCodes.FORBIDDEN).send({
                    message: "You do not have the required permissions"
                });
            }
        } catch (err) {
            logger.error(`Error verifying user permissions: ${err}`);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                message: "Error verifying permissions"
            });
        }
    };
}

async function verifyAPIKey(req, res, next) {
    const key = res.locals.data.authorization;
    try {
        const approved = await userService.checkForAPIKey(key);
        if (approved) {
            logger.info("API Key authorized");
            next();
        }
        else {
            logger.info("API Access Denied");
            res.status(StatusCodes.UNAUTHORIZED).send({
                message: "Unauthorized"
            });
        }
    }
    catch (err) {
        logger.error(`API key check failed: ${err}`);
        res.status(StatusCodes.UNAUTHORIZED).send({
            message: "Unauthorized"
        });
    }
}

//this middleware just confirms the settings build up in
//index.js. The rejectUnauthorized will stop bad requests
//before it hits this block. In effect, no unauthorized message will
//make it this far (which eliminates extra logging on 401 responses)
async function verifyInstrument(req, res, next) {
    try {
        const serverDetails = req.socket._tlsOptions.server;
        if (serverDetails.requestCert === true &&
            serverDetails.rejectUnauthorized === true &&
            serverDetails.ca.length === 1 &&
            req.socket.authorized === true) {
            logger.info("Instrument Authorized");
            next();
        }
        else {
            logger.info("Unable to Auth Instrument");
            res.status(StatusCodes.UNAUTHORIZED).send({
                message: ""
            });
        }
    }
    catch (err) {
        logger.error(`Return product upload denied: ${err}`);
    }
}

module.exports = {
	LOC,
	PERM,
    verify,
    verifyAPIKey,
	verifyInstrument
};
