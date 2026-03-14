"use strict";
const systemController = require("../controllers/system.controller");
const paramMid = require( "../middleware/mqtt-input.middleware.js");
const logger = require("../logger");

var routeCommands = new Map();

routeCommands.set("info", [paramMid.reqMetrics, systemController.storeSystemMetrics]);

routeCommands.set("shell", [paramMid.reqShellResp, systemController.processSystemShellResponse]);

routeCommands.set("data", [paramMid.reqDataResp, systemController.processSystemGetFile]);

async function process(message) {
    try {
        const commandRequested = paramMid.getCommand(message, function(err) {
            logger.error(`SQS Message Error: ${err}`);
        });
        if (commandRequested !== undefined) {
            let command = routeCommands.get(commandRequested.command);
            if (command !== undefined) {
                let args = paramMid.valInput(commandRequested.id, message, command[0], function(err) {
                    logger.error(`Bad IOT command: ${err}`);
                });
                if (args !== undefined) {
                    await command[1].apply(this, args);
                }
            }
            else {
                logger.error("Unknown IOT Command Received");
            }
        }
    }
    catch (err) {
        logger.error(`MQTT message unhandled: ${err}`);
    }
}

module.exports = {
    process
};
