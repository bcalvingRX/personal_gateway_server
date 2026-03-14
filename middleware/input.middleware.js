"use strict";
const { StatusCodes } = require("http-status-codes");
const { cookie, query, body, header, validationResult, matchedData } = require("express-validator");
const logger = require("../logger");


function injectMockUser(req, res, next) {
	if (process.env.NODE_ENV === "development") {
		req.headers.useremail = "test.admin1@rxfunction.com";
		logger.debug("Injected mock user email into headers for local development");
	}
	next();
  }

function valInput(req, res, next) {
	const result = validationResult(req);
	if (result.isEmpty()) {
	  res.locals.data = matchedData(req);
	  next();
	}
	else {
	  logger.error(JSON.stringify({ errors: result.array() }));
	  res.status(StatusCodes.BAD_REQUEST).send({ errors: result.array() });
	}
  }

//APP-WIDE parameter validation and sanitation
const reqCookie = () => [
	injectMockUser,
	header("useremail").exists().bail().trim().escape().isString(),
	cookie("sessID").exists().notEmpty().bail(), //no messages intended
	valInput];

const reqRegToken = () => [header("authorization").exists()
	.withMessage("authorization header is required").bail().trim().escape().isString()
	.withMessage("authorization header must be a string").bail().notEmpty()
	.withMessage("authorization header must not be empty"),
	valInput];

//REPORTS parameter validation and sanitation
const reqRPCreateTemplate = () => [body("name").exists()
	.withMessage("name is required").bail().trim().escape().isString()
	.withMessage("name must be a string").bail().notEmpty()
	.withMessage("name must not be empty").bail(),
	body("types").exists()
	.withMessage("types is required").bail().isArray({ min: 1 })
	.withMessage("types must be an array with a length greater than or equal to 1").bail(),
	body("shared").exists()
	.withMessage("shared is required").bail().isBoolean()
	.withMessage("shared must be a boolean"),
	body("items").exists()
	.withMessage("items is required"),
	valInput];
const reqRPUpdateTemplate = () => [body("id").exists()
	.withMessage("id is required").bail().trim().escape().isString()
	.withMessage("id must be a string").bail().notEmpty()
	.withMessage("id must not be empty").bail(),
	body("types").exists()
	.withMessage("types is required").bail().isArray({ min: 1 })
	.withMessage("types must be an array with a length greater than or equal to 1").bail(),
	body("shared").exists()
	.withMessage("shared is required").bail().isBoolean()
	.withMessage("shared must be a boolean"),
	body("items").exists()
	.withMessage("items is required"),
	valInput];
const reqRPDeleteTemplate = () => [query("id").exists()
	.withMessage("id is required").bail().trim().escape().isString()
	.withMessage("id must be a string").bail().notEmpty()
	.withMessage("id must not be empty").bail(),
	valInput];

//USER MANAGEMENT parameter validation and sanitation
const reqUMParamGetUsrs = () => [query("index").trim().escape().isInt({ min: 0, max: 4123510639000 })
	.withMessage("index must be a number between 0 and 4123510639000").bail(),
	valInput];
const reqUMParamEditUsr = () => [body("name").exists()
	.withMessage("name is required").bail().trim().escape().isString()
	.withMessage("name must be a string").bail().notEmpty()
	.withMessage("name must not be empty").bail(),
	body("groupId").exists()
	.withMessage("groupId is required").bail().trim().escape().isString()
	.withMessage("groupId must be a string").bail().notEmpty()
	.withMessage("groupId must not be empty"),
	valInput];
const reqUMParamUsrQ = () => [query("user").exists()
	.withMessage("user is required").bail().trim().escape().isString()
	.withMessage("user must be a string").bail().notEmpty()
	.withMessage("user must not be empty"),
	valInput];
const reqUMParamDeleteUsrGrp = () => [query("id").exists()
	.withMessage("id is required").bail().trim().escape().isString()
	.withMessage("id must be a string").bail().notEmpty()
	.withMessage("id must not be empty"),
	valInput];
const reqUMParamEditUsrGrp = () => [body("id").exists()
	.withMessage("id is required").bail().trim().escape().isString()
	.withMessage("id must be a string").bail().notEmpty()
	.withMessage("id must not be empty").bail(),
	body("permissions").exists()
	.withMessage("permissions is required").bail().isArray()
	.withMessage("permissions must be an array").bail().notEmpty()
	.withMessage("permissions must not be empty").bail(),
	body("permissions.*.action").exists()
	.withMessage("permissions.*.action is required").bail().trim().escape().isString()
	.withMessage("permissions.*.action must be a string").notEmpty()
	.withMessage("permissions.*.action must not be empty").bail().isIn(["add", "remove"])
	.withMessage("permissions.*.action must be either \"add\" or \"remove\"").bail(),
	body("permissions.*.location").exists()
	.withMessage("permissions.*.location is required").bail().trim().escape().isString()
	.withMessage("permissions.*.location must be a string").bail().notEmpty()
	.withMessage("permissions.*.location must not be empty").bail(),
	body("permissions.*.name").exists()
	.withMessage("permissions.*.name is required").bail().trim().escape().isString()
	.withMessage("permissions.*.name must be a string").bail().notEmpty()
	.withMessage("permissions.*.name must not be empty").bail(),
	valInput];
const reqUMParamCreateUsrGrp = () => [body("name").exists()
	.withMessage("name is required").bail().trim().escape().isString()
	.withMessage("name must be a string").bail().notEmpty()
	.withMessage("name must not be empty"),
	valInput];

//System parameter validation and sanitation
const reqProvisionSystem = () => [body("fleetID").exists()
	.withMessage("fleetID is required").bail().trim().escape().isString()
	.withMessage("fleetID must be a string").bail().notEmpty()
	.withMessage("fleetID must not be empty"),
	body("devices").isArray({ min: 1 })
    .withMessage("Devices must be a non-empty array"),
	body("devices.*.device_id").isString()
	.withMessage("device_id must be a string")
	.notEmpty().withMessage("device_id is required"),
	body("devices.*.group_id").isString()
	.withMessage("group_id must be a string").notEmpty()
	.withMessage("group_id is required"),
	body("devices.*.thing_id").optional({ nullable: true }).isString()
	.withMessage("thing_id must be a string"),
	body("devices.*.type").isString()
	.withMessage("type must be a string").notEmpty()
	.withMessage("type is required"),
	valInput];
const reqGetSystems = () => [query("index").trim().escape().isInt({ min: 0, max: 4123510639000 })
	.withMessage("index must be a number between 0 and 4123510639000").bail(),
	query("systemID").optional().trim().escape().isString()
	.withMessage("systemID must be a string").bail().notEmpty()
	.withMessage("systemID must not be empty").bail(),
	query("fleetID").optional().trim().escape().isString()
	.withMessage("fleetID must be a string").bail().notEmpty()
	.withMessage("fleetID must not be empty").bail(),
	valInput];
const reqGetNumSystems = () => [query("systemID").optional().trim().escape().isString()
	.withMessage("systemID must be a string").bail().notEmpty()
	.withMessage("systemID must not be empty").bail(),
	query("fleetID").optional().trim().escape().isString()
	.withMessage("fleetID must be a string").bail().notEmpty()
	.withMessage("fleetID must not be empty").bail(),
	valInput];
const reqSystemDetails = () => [query("systemID").exists()
	.withMessage("systemID is required").bail().trim().escape().isString()
	.withMessage("systemID must be a string").bail().notEmpty()
	.withMessage("systemID must not be empty"),
	valInput];
const reqSystemMetrics = () => [query("systemID").exists()
	.withMessage("systemID is required").bail().trim().escape().isString()
	.withMessage("systemID must be a string").bail().notEmpty()
	.withMessage("systemID must not be empty"),
	valInput];
const reqPostSystemFleet = () => [body("systemID").exists()
	.withMessage("systemID is required").bail().trim().escape().isString()
	.withMessage("systemID must be a string").bail().notEmpty()
	.withMessage("systemID must not be empty"),
	body("fleetID").exists()
	.withMessage("fleetID is required").bail().trim().escape().isString()
	.withMessage("fleetID must be a string").bail().notEmpty()
	.withMessage("fleetID must not be empty"),
	valInput];
const reqDeviceDetails = () => [query("deviceID").exists()
	.withMessage("deviceID is required").bail().trim().escape().isString()
	.withMessage("deviceID must be a string").bail().notEmpty()
	.withMessage("deviceID must not be empty"),
	valInput];
const reqModifySystem = () => [body("systemID").exists()
	.withMessage("systemID is required").bail().trim().escape().isString()
	.withMessage("systemID must be a string").bail().notEmpty()
	.withMessage("systemID must not be empty"),
	body("additions").exists()
	.withMessage("additions is required").bail().isArray({ min: 0 })
    .withMessage("additions must be an array"),
	body("additions.*.device_id").isString()
	.withMessage("addition's device_id must be a string")
	.notEmpty().withMessage("addition's device_id is required"),
	body("removals").exists()
	.withMessage("removals is required").bail().isArray({ min: 0 })
    .withMessage("removals must be an array"),
	body("removals.*.device_id").isString()
	.withMessage("removals's device_id must be a string")
	.notEmpty().withMessage("removals's device_id is required"),
	valInput];
const reqSystemRmvListener = () => [query("system").exists()
	.withMessage("system is required").bail().trim().escape().isString()
	.withMessage("system must be a string").bail().notEmpty()
	.withMessage("system must not be empty"),
	valInput];
const reqSystemSIMDetails = () => [query("sim").exists()
	.withMessage("sim is required").bail().trim().escape().isString()
	.withMessage("sim must be a string").bail().notEmpty()
	.withMessage("sim must not be empty"),
	valInput];
const reqSystemShellCommand = () => [body("system").exists()
	.withMessage("system is required").bail().trim().escape().isString()
	.withMessage("system must be a string").bail().notEmpty()
	.withMessage("system must not be empty").bail(),
	body("command").exists()
	.withMessage("command is required").bail().trim().escape().isString()
	.withMessage("command must be a string").bail().notEmpty()
	.withMessage("command must not be empty").bail(),
	body("retain").exists()
	.withMessage("retain is required").bail().trim().escape().isBoolean()
	.withMessage("retain must be a boolean").bail(),
	valInput];
const reqFWParamGetFirmware = () => [
	query("firmwareID").optional().trim().escape().isString()
	.withMessage("firmwareID must be a string").bail(),
	query("populateFleets").optional().trim().escape().isBoolean()
	.withMessage("populateFleets must be a boolean").bail(),
	query("index").trim().escape().isInt({ min: 0, max: 4123510639000 })
	.withMessage("index must be a number between 0 and 4123510639000").bail(),
	valInput];
const reqFWParamPostFirmware = () => [body("source").exists()
	.withMessage("source is required").bail().trim().escape().isString()
	.withMessage("source must be a string").bail().isIn(["glg", "gh"])
	.withMessage("source must be either \"glg\" or \"gh\"").bail(),
	body("firmwareID").exists()
	.withMessage("firmwareID is required").bail().trim().escape().isString()
	.withMessage("firmwareID must be a string").bail().notEmpty()
	.withMessage("firmwareID must not be empty").bail().matches(/^\S+$/)
	.withMessage("firmwareID must not contain spaces").bail(),
	body("description").exists()
	.withMessage("description is required").bail().trim().escape().isString()
	.withMessage("description must be a string").bail().notEmpty()
	.withMessage("description must not be empty").bail(),
	body("revisionID").if((value, { req }) => req.body.source === "glg").exists()
	.withMessage("revisionID is required when source is 'glg'").bail().trim().escape()
    .isString().withMessage("revisionID must be a string").bail()
    .notEmpty().withMessage("revisionID must not be empty").bail(),
	body("org").if((value, { req }) => req.body.source === "gh").exists()
	.withMessage("org is required when source is 'gh'").bail().trim().escape()
    .isString().withMessage("org must be a string").bail()
    .notEmpty().withMessage("org must not be empty").bail(),
	body("repo").if((value, { req }) => req.body.source === "gh").exists()
	.withMessage("repo is required when source is 'gh'").bail().trim().escape()
    .isString().withMessage("repo must be a string").bail()
    .notEmpty().withMessage("repo must not be empty").bail(),
	body("tag").if((value, { req }) => req.body.source === "gh").exists()
	.withMessage("tag is required when source is 'gh'").bail().trim().escape()
    .isString().withMessage("tag must be a string").bail()
    .notEmpty().withMessage("tag must not be empty").bail(),
	body("file").exists()
	.withMessage("file is required").bail().trim().escape().isString()
	.withMessage("file must be a string").bail().notEmpty()
	.withMessage("file must not be empty").bail(),
	valInput];
const reqFWParamGetFirmwareCount = () => [
	query("firmwareID").optional().trim().escape().isString()
	.withMessage("firmwareID must be a string").bail(),
	valInput];
const reqFWParamGetGroups = () => [
	query("groupID").optional().trim().escape().isString()
	.withMessage("groupID must be a string").bail(),
	query("populateFleets").optional().trim().escape().isBoolean()
	.withMessage("populateFleets must be a boolean").bail(),
	query("index").trim().escape().isInt({ min: 0, max: 4123510639000 })
	.withMessage("index must be a number between 0 and 4123510639000").bail(),
	valInput];
const reqFWParamPostGroup = () => [
	body("groupID").exists()
	.withMessage("groupID is required").bail().trim().escape().isString()
	.withMessage("groupID must be a string").bail().notEmpty()
	.withMessage("groupID must not be empty").bail().matches(/^\S+$/)
	.withMessage("groupID must not contain spaces").bail(),
	body("description").exists()
	.withMessage("description is required").bail().trim().escape().isString()
	.withMessage("description must be a string").bail().notEmpty()
	.withMessage("description must not be empty").bail(),
	valInput];
const reqFWParamPostFleet = () => [
	body("fleetID").exists()
	.withMessage("fleetID is required").bail().trim().escape().isString()
	.withMessage("fleetID must be a string").bail().notEmpty()
	.withMessage("fleetID must not be empty").bail().matches(/^\S+$/)
	.withMessage("fleetID must not contain spaces").bail(),
	body("description").exists()
	.withMessage("description is required").bail().trim().escape().isString()
	.withMessage("description must be a string").bail().notEmpty()
	.withMessage("description must not be empty").bail(),
	valInput];
const reqFWParamGetGroupCount = () => [
	query("groupID").optional().trim().escape().isString()
	.withMessage("groupID must be a string").bail(),
	valInput];
const reqFWParamGetFleet = () => [query("fleetID").optional().trim().escape().isString()
	.withMessage("fleetID must be a string").bail().notEmpty()
	.withMessage("fleetID must not be empty").bail(),
	valInput];
const reqFWParamGetFleets = () => [query("index").trim().escape().isInt({ min: 0, max: 4123510639000 })
	.withMessage("index must be a number between 0 and 4123510639000").bail(),
	valInput];
const reqFWParamModifyFleets = () => [body("fleetID").exists()
	.withMessage("fleetID is required").bail().trim().escape().isString()
	.withMessage("fleetID must be a string").bail().notEmpty()
	.withMessage("fleetID must not be empty").bail(),
	body("modifications").exists()
	.withMessage("modifications is required").bail().isArray({ min: 1 })
    .withMessage("modifications must be an array").bail(),
	body("modifications.*.group_id").isString()
	.withMessage("modification's group_id must be a string").bail().notEmpty()
	.withMessage("modification's group_id is required").bail(),
	body("modifications.*.firmware_id").bail().isString()
	.withMessage("modification's firmware_id must be a string").bail().notEmpty()
	.withMessage("modification's firmware_id is required").bail(),
	valInput];
const reqFWParamCheckGHFW = () => [query("org").exists()
	.withMessage("org is required").bail().trim().escape().isString()
	.withMessage("org must be a string").bail().notEmpty()
	.withMessage("org must not be empty").bail(),
	query("repo").exists()
	.withMessage("repo is required").bail().trim().escape().isString()
	.withMessage("repo must be a string").bail().notEmpty()
	.withMessage("repo must not be empty").bail(),
	query("tag").exists()
	.withMessage("tag is required").bail().trim().escape().isString()
	.withMessage("tag must be a string").bail().notEmpty()
	.withMessage("tag must not be empty").bail(),
	query("file").exists()
	.withMessage("file is required").bail().trim().escape().isString()
	.withMessage("file must be a string").bail().notEmpty()
	.withMessage("file must not be empty").bail(),
	valInput];
const reqFWParamCheckGLGFW = () => [query("revision").exists()
	.withMessage("revision is required").bail().trim().escape().isString()
	.withMessage("revision must be a string").bail().notEmpty()
	.withMessage("revision must not be empty").bail(),
	query("file").exists()
	.withMessage("file is required").bail().trim().escape().isString()
	.withMessage("file must be a string").bail().notEmpty()
	.withMessage("file must not be empty").bail(),
	valInput];

//FW RECORD parameter validation and sanitation
const reqFWRecParamGetRecord = () => [query("recordID").optional().trim().escape().isString()
	.withMessage("recordID must be a string").bail().notEmpty()
	.withMessage("recordID must not be empty").bail(),
	query("index").trim().escape().isInt({ min: 0, max: 4123510639000 })
	.withMessage("index must be a number between 0 and 4123510639000").bail(),
	query("hardwareID").optional().trim().escape().isString()
	.withMessage("hardwareID must be a string").bail().notEmpty()
	.withMessage("hardwareID must not be empty").bail(),
	query("outcome").optional().trim().escape().isString()
	.withMessage("outcome must be a string").bail().isIn(["complete", "failed", "aborted"])
	.withMessage("outcome must be either \"complete\", \"failed\", or \"aborted\"").bail(),
	query("update_start_timestamp").optional().trim().escape().isInt({ min: 0, max: 4123510639000 }) //year 2100
	.withMessage("update_start_timestamp must be a number between 0 and 4123510639000").bail(),
	query("update_end_timestamp").optional().trim().escape().isInt({ min: 0, max: 4123510639000 }) //year 2100
	.withMessage("update_end_timestamp must be a number between 0 and 4123510639000"),
	valInput];
const reqFWRecParamGetNumRecord = () => [query("hardwareID").optional().trim().escape().isString()
	.withMessage("hardwareID must be a string").bail().notEmpty()
	.withMessage("hardwareID must not be empty").bail(),
	query("outcome").optional().trim().escape().isString()
	.withMessage("outcome must be a string").bail().isIn(["complete", "failed", "aborted"])
	.withMessage("outcome must be either \"complete\", \"failed\", or \"aborted\"").bail(),
	query("update_start_timestamp").optional().trim().escape().isInt({ min: 0, max: 4123510639000 }) //year 2100
	.withMessage("update_start_timestamp must be a number between 0 and 4123510639000").bail(),
	query("update_end_timestamp").optional().trim().escape().isInt({ min: 0, max: 4123510639000 }) //year 2100
	.withMessage("update_end_timestamp must be a number between 0 and 4123510639000"),
	valInput];
const reqFWRecParamDeleteRecord = () => [query("recordID").exists()
	.withMessage("recordID is required").bail().trim().escape().isString()
	.withMessage("recordID must be a string").bail().notEmpty()
	.withMessage("recordID must not be empty"),
	valInput];

//FW UPDATE SESSION parameter validation and sanitation
const reqFWParamHasSess = () => [query("gateway").exists()
	.withMessage("gateway is required").bail().trim().escape().isString()
	.withMessage("gateway must be a string").bail().notEmpty()
	.withMessage("gateway must not be empty").bail(),
	valInput];
const reqFWTemplate = () => [query("template").exists()
	.withMessage("template is required").bail().trim().escape().isString()
	.withMessage("template must be a string").bail().notEmpty()
	.withMessage("template must not be empty").bail(),
	valInput];
const reqFWParamGetSess = () => [query("session").exists()
	.withMessage("session is required").bail().trim().escape().isString()
	.withMessage("session must be a string").bail().notEmpty()
	.withMessage("session must not be empty").bail(),
	valInput];
const reqFWParamGetNumSess = () => [query("gateway").exists()
	.withMessage("gateway is required").bail().trim().escape().isString()
	.withMessage("gateway must be a string").bail().notEmpty()
	.withMessage("gateway must not be empty").bail(),
	valInput];
const reqFWParamGetAllSess = () => [query("gateway").exists()
	.withMessage("gateway is required").bail().trim().escape().isString()
	.withMessage("gateway must be a string").bail().notEmpty()
	.withMessage("gateway must not be empty").bail(),
	query("index").trim().escape().isInt({ min: 0, max: 4123510639000 })
	.withMessage("index must be a number between 0 and 4123510639000").bail(),
	valInput];
const reqFWParamStartSess = () => [body("gateway").exists()
	.withMessage("gateway is required").bail().trim().escape().isString()
	.withMessage("gateway must be a string").bail().notEmpty()
	.withMessage("gateway must not be empty").bail(),
valInput];
const reqFWSetSessionOffline = () => [body("sessionID").exists()
	.withMessage("sessionID is required").bail().trim().escape().isString()
	.withMessage("sessionID must be a string").bail().notEmpty()
	.withMessage("sessionID must not be empty").bail(),
	valInput];
const reqFWAbortSessions = () => [body("gateway").exists()
	.withMessage("gateway is required").bail().trim().escape().isString()
	.withMessage("gateway must be a string").bail().notEmpty()
	.withMessage("gateway must not be empty").bail(),
	valInput];
const reqFWParamAddAct = () => [body("sessionID").exists()
	.withMessage("sessionID is required").bail().trim().escape().isString()
	.withMessage("sessionID must be a string").bail().notEmpty()
	.withMessage("sessionID must not be empty").bail(),
	body("actionID").exists()
	.withMessage("actionID is required").bail().trim().escape().isString()
	.withMessage("actionID must be a string").bail().notEmpty()
	.withMessage("actionID must not be empty").bail(),
	body("results").exists()
	.withMessage("results is required").bail().trim().escape().isArray()
	.withMessage("results must be an array").bail().notEmpty()
	.withMessage("results must not be empty").bail(),
	body("path").exists()
	.withMessage("path is required").bail().trim().escape().isString()
	.withMessage("path must be a string").bail().notEmpty()
	.withMessage("path must not be empty").bail(),
	body("pathArgs").exists()
	.withMessage("pathArgs is required").bail().trim().escape().isString()
	.withMessage("pathArgs must be a string").bail(),
	valInput];
const reqFWParamGetAct = () => [query("actionID").exists()
	.withMessage("actionID is required").bail().trim().escape().isString()
	.withMessage("actionID must be a string").bail().notEmpty()
	.withMessage("actionID must not be empty").bail(),
	query("populateStr").exists()
	.withMessage("populateStr is required").bail().trim().escape().isBoolean()
	.withMessage("populateStr must be a boolean").bail(),
	valInput];
const reqFWParamSessHeader = () => [header("sessionID").exists()
	.withMessage("sessionID header is required").bail().trim().escape().isString()
	.withMessage("sessionID header must be a string").bail().notEmpty()
	.withMessage("sessionID header must not be empty"),
	valInput];
const reqFWParamStart = () => [body("gatewayID").exists()
	.withMessage("gatewayID is required").bail().trim().escape().isString()
	.withMessage("gatewayID must be a string").bail().notEmpty()
	.withMessage("gatewayID must not be empty").bail(),
	body("requestManager").exists()
	.withMessage("requestManager is required").bail().isBoolean()
	.withMessage("requestManager must be a boolean"),
	valInput];
const reqFWParamSessID = () => [body("sessionID").exists()
	.withMessage("sessionID is required").bail().trim().escape().isString()
	.withMessage("sessionID must be a string").bail().notEmpty()
	.withMessage("sessionID must not be empty"),
	valInput];
const reqFWParamSessIDQ = () => [query("sessionID").exists()
	.withMessage("sessionID is required").bail().trim().escape().isString()
	.withMessage("sessionID must be a string").bail().notEmpty()
	.withMessage("sessionID must not be empty"),
	valInput];
const reqFWParamSessIDQOp = () => [query("sessionID").optional().trim().escape().isString()
	.withMessage("sessionID must be a string").bail().notEmpty()
	.withMessage("sessionID must not be empty"),
	valInput];
const reqFWParamActionResp = () => [body("sessionID").exists()
	.withMessage("sessionID is required").bail().trim().escape().isString()
	.withMessage("sessionID must be a string").bail().notEmpty()
	.withMessage("sessionID must not be empty").bail(),
	body("actionID").exists()
	.withMessage("actionID is required").bail().trim().escape().isString()
	.withMessage("actionID must be a string").bail().notEmpty()
	.withMessage("actionID must not be empty").bail(),
	body("answer").exists()
	.withMessage("answer is required").bail().trim().escape().isString()
	.withMessage("answer must be a string").bail().notEmpty()
	.withMessage("answer must not be empty"),
	valInput];
const reqDLFWImages = () => [query("id").optional().trim().escape().isString()
	.withMessage("id must be a string").bail().notEmpty()
	.withMessage("id must not be empty"),
	valInput];
const reqFWParamAddAction = () => [body("control").exists()
	.withMessage("control is required").bail().trim().escape().isString()
	.withMessage("control must be a string").bail().notEmpty()
	.withMessage("control must not be empty").bail(),
	body("type").exists()
	.withMessage("type is required").bail().trim().escape().isString()
	.withMessage("type must be a string").bail().isIn(["choice", "input", "instruction", "info"])
	.withMessage("type must be either \"choice\", \"input\", \"instruction\", or \"info\"").bail(),
	body("sessionID").exists()
	.withMessage("sessionID is required").bail().trim().escape().isString()
	.withMessage("sessionID must be a string").bail().notEmpty()
	.withMessage("sessionID must not be empty").bail(),
	body("action").exists()
	.withMessage("action is required"),
	valInput];
const reqFWParamFinishSession = () => [body("sessionID").exists()
	.withMessage("sessionID is required").bail().trim().escape().isString()
	.withMessage("sessionID must be a string").bail().notEmpty()
	.withMessage("sessionID must not be empty").bail(),
	body("hardwareID").exists()
	.withMessage("hardwareID is required").bail().trim().escape().isString()
	.withMessage("hardwareID must be a string").bail().notEmpty()
	.withMessage("hardwareID must not be empty").bail(),
	body("outcome").exists()
	.withMessage("outcome is required").bail().trim().escape().isString()
	.withMessage("outcome must be a string").bail().isIn(["complete", "failed", "aborted"])
	.withMessage("outcome must be either \"complete\", \"failed\", or \"aborted\""),
	valInput];

module.exports = {
	reqCookie,
	reqRegToken,
	reqRPCreateTemplate,
	reqRPUpdateTemplate,
	reqRPDeleteTemplate,
	reqUMParamGetUsrs,
	reqUMParamEditUsr,
	reqUMParamUsrQ,
	reqUMParamDeleteUsrGrp,
	reqUMParamEditUsrGrp,
	reqProvisionSystem,
	reqGetSystems,
	reqGetNumSystems,
	reqDeviceDetails,
	reqModifySystem,
	reqSystemDetails,
	reqSystemMetrics,
	reqPostSystemFleet,
	reqSystemRmvListener,
	reqSystemSIMDetails,
	reqFWParamGetFleet,
	reqFWParamGetFirmware,
	reqFWParamPostFirmware,
	reqFWParamGetFirmwareCount,
	reqFWParamGetGroups,
	reqFWParamPostGroup,
	reqFWParamPostFleet,
	reqFWParamGetGroupCount,
	reqFWParamGetFleets,
	reqFWParamCheckGLGFW,
	reqFWParamCheckGHFW,
	reqFWParamModifyFleets,
	reqSystemShellCommand,
	reqUMParamCreateUsrGrp,
	reqFWRecParamGetRecord,
	reqFWRecParamGetNumRecord,
	reqFWRecParamDeleteRecord,
	reqFWParamHasSess,
	reqFWTemplate,
	reqFWParamGetSess,
	reqFWParamGetNumSess,
	reqFWParamGetAllSess,
	reqFWSetSessionOffline,
	reqFWAbortSessions,
	reqFWParamStartSess,
	reqFWParamAddAct,
	reqFWParamGetAct,
	reqFWParamSessHeader,
    reqFWParamStart,
    reqFWParamSessID,
	reqFWParamSessIDQ,
	reqFWParamSessIDQOp,
	reqFWParamActionResp,
    reqFWParamAddAction,
	reqDLFWImages,
    reqFWParamFinishSession
};
