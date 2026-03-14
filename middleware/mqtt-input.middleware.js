"use strict";
var Validator = require("validatorjs");

Validator.register("valid_number_string", function(value) {
    return typeof value === "string" && !isNaN(value) && value.trim() !== "";
}, "The :attribute must be a valid number string.");

Validator.register("valid_json", function(value) {
     return typeof value === "object" && value !== null && !Array.isArray(value);
}, "The :attribute must be a valid json object.");

const mqttRequest = {
	command: "required|string",
	gateway: "required|string"
};

const reqMetrics = {
	record: "required|valid_json",
};

const reqShellResp = {
    message: "required|string"
};

const reqDataResp = {
    file: "required|string",
    type: "required|string|in:fw,fw_man,rand",
    offset: "required|valid_number_string"
};

const reqRespondAction = {
	actionID: "required|string",
	results: "required|array",
	path: "required|string",
	pathArgs: "required|string",
};

function valInput(id, data, rules, error) {
    let args;
    let validation = new Validator(data, rules);
    let result = validation.passes();
    if (result) {
        args = [id];
        for (const [key] of Object.entries(rules)) {
            args.push(data[key]);
        }
    }
    else {
        error(JSON.stringify(validation.errors));
    }
    return args;
}

function getCommand(data, error) {
    let result;
    let validation = new Validator(data, mqttRequest);
    let valResult = validation.passes();
    if (valResult) {
        result = {
            command: data.command,
            id: data.gateway
        };
    }
    else {
        error(JSON.stringify(validation.errors));
    }
    return result;
}

module.exports = {
	reqMetrics,
    reqShellResp,
    reqDataResp,
    reqRespondAction,
    getCommand,
    valInput
};
