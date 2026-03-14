"use strict";
const awsIOTService = require("../services/aws.iot.service");
const awsAthenaService = require("../services/aws.athena.service");
const redisService = require("../services/redis.service");
const glgService = require("../services/greenlightguru.service");
const ghService = require("../services/github.service");
const simbaseService = require("../services/simbase.service");
const systemService = require("../services/system.service.js");
const logger = require("../logger");
const { StatusCodes } = require("http-status-codes");

const GW_FILES_BUCKET = process.env.GW_FILES_BUCKET;
const GW_FILE_MIN_EXP_SEC = 604800; //1 week in seconds (GW may take this long to download files)
const GW_URL_EXP_SEC = 60 * 10; //10 minutes

async function getSystems(req, res, next) {
    logger.info("Getting Systems");
    systemService.getSystems(res.locals.data.index,
        res.locals.data.systemID,
        res.locals.data.fleetID).then((results) => {
        res.json(results);
    }).catch(err => {
        logger.info(`ERR getting systems: ${err}`);
        next(err);
    });
}

async function getNumSystems(req, res, next) {
    logger.info("Getting Number of Systems");
    systemService.getNumSystems(res.locals.data.systemID,
        res.locals.data.fleetID).then((results) => {
        res.json(results);
    }).catch(err => {
        logger.info(`ERR getting number of systems: ${err}`);
        next(err);
    });
}

async function getSystemShadow(system) {
    logger.info(`Getting shadow for system: ${system.system_name}`);
	try {
        const gateway = system.devices.find(device => !!device.thing_id);
        if (gateway) {
            logger.info(`Thing name: ${gateway.thing_id }`);
            const deviceShadow = await awsIOTService.getShadowsForADevice(gateway.thing_id);
            if (!deviceShadow) {
                throw new Error("gateway unknown");
            }
            logger.info("System shadow retrieved successfully");
            return deviceShadow;
        }
        else {
            throw new Error("No registered IoT Thing ID for system");
        }
    }
	catch (err) {
		logger.error(`ERR unable to retrieve system shadow: ${err}`);
	}
    return undefined;
}

async function getSystem(req, res, next) {
    logger.info(`Getting system, idx: ${res.locals.data.systemID}`);
    try {
        const system = await systemService.getSystem(res.locals.data.systemID);
        if (!system) {
            throw new Error(`Could not get system: ${res.locals.data.systemID}`);
        }
        const systemShadow = await getSystemShadow(system);
        if (!systemShadow) {
            logger.warn("System has no shadow");
        }
        else {
            system.shadow = systemShadow;
        }
        res.json(system);
    }
    catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting system: ${err.message}`);
        next(err);
    };
}

async function setFleet(req, res, next) {
    const systemID = res.locals.data.systemID;
    const fleetID = res.locals.data.fleetID;
    logger.info(`Changing system fleet. System ID: ${systemID}, Fleet ID: ${fleetID}`);
    try {
        const system = await systemService.getSystem(systemID);
        if (!system) {
            throw new Error(`Could not get system: ${res.locals.data.systemID}`);
        }
        const fleet = await systemService.getFleet(fleetID, false);
        if (!fleet) {
            throw new Error(`Fleet not found: ${fleetID}`);
        }
        if (fleet._id.toString() !== system.fleet._id.toString()) {
            await systemService.changeSystemFleet(systemID, fleet._id);
            logger.info("System updated successfully");
            res.status(StatusCodes.OK).send();
        }
        else {
            logger.info("System already assigned to fleet");
            res.status(StatusCodes.OK).send();
        }
    }
    catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error udpating system: ${err.message}`);
        next(err);
    };
}

async function getDevice(req, res, next) {
    logger.info(`Getting device, idx: ${res.locals.data.deviceID}`);
    systemService.getDevice(res.locals.data.deviceID).then((results) => {
        res.json(results);
    }).catch(err => {
        logger.info(`ERR getting device: ${err}`);
        next(err);
    });
}

async function modifySystem(req, res, next) {
    logger.info(`Updating system, idx: ${res.locals.data.systemID}, additions: ${res.locals.data.additions}, removals: ${res.locals.data.removals}`);
    try {
        for (const deviceId of res.locals.data.additions) {
            await systemService.addDeviceToSystem(res.locals.data.systemID, deviceId);
        }
        for (const deviceId of res.locals.data.removals) {
            await systemService.removeDeviceFromSystem(res.locals.data.systemID, deviceId);
        }
        if (res.locals.data.additions.length > 0) {
            await systemService.updateDirtyBit(res.locals.data.systemID, true);
        }
        logger.info("System updated successfully");
        res.status(StatusCodes.OK).send();
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error updating system ${err.message}`);
        next(err);
    }
}

async function getSystemMetrics(req, res, next) {
    logger.info(`Getting system metrics, systemID: ${res.locals.data.systemID}`);
    try {
        const results = await systemService.getSystemMetrics(res.locals.data.systemID);
        res.json(results);
    }
    catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting system metrics: ${err.message}`);
        next(err);
    };
}

async function storeSystemMetrics(thingID, record) {
    try {
        const hasRecentUpload = await redisService.getKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, thingID);
        if (!hasRecentUpload) {
            const system = await systemService.getSystemFromThingID(thingID);
            if (system) {
                await redisService.setKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, thingID, "UP");
                await systemService.storeSystemMetrics(system.system_name, thingID, record);
                logger.info("System metrics saved successfully");
            }
            else {
                logger.warn(`Thing ID not associated with system, metrics ignored. ID: ${thingID}`);
            }
        }
        else {
            logger.info("System metrics report ignored, too frequent");
        }
    }
    catch (err) {
        logger.error(`Error saving system metrics ${err.message}`);
    }
}

async function processSystemDataRequest(systemID, file, offset, getFile) {
    try {
        if (!await redisService.acquireS3Lock()) {
            logger.info("Unable to aquire S3 lock");
            const message = {
                command: "data",
                message: "Temporary error, try again"
            };
            await awsIOTService.publishMessageToDevice(systemID, 1, message, false);
            return;
        }
        const expiringIn = await awsAthenaService.getS3DataExpiry(GW_FILES_BUCKET, file);
        let dataReady = false;
        if (expiringIn !== null && expiringIn < GW_FILE_MIN_EXP_SEC) {
            logger.info(`File expiring in ${expiringIn} seconds. refreshing expiry`);
            await awsAthenaService.resetS3Expiration(GW_FILES_BUCKET, file);
            dataReady = true;
        }
        else if (expiringIn === null) {
            logger.info("File not found in S3, uploading..");
            const fileData = await getFile();
            if (fileData && fileData.length > 0) {
                logger.info(`File retrieved, length: ${fileData.length}. Uploading to S3`);
                await awsAthenaService.uploadToS3(fileData, GW_FILES_BUCKET, file);
                dataReady = true;
            }
            else {
                throw Error("Could not retrieve file");
            }
        }
        else {
            logger.info(`File expiring in ${expiringIn} seconds. Within min-TTL, proceeding...`);
            dataReady = true;
        }
        await redisService.releaseS3Lock();
        if (dataReady) {
            const ephemeralURL = await awsAthenaService.getEphemeralURL(GW_FILES_BUCKET, file, offset, GW_URL_EXP_SEC);
            const message = {
                command: "data",
                message: ephemeralURL
            };
            logger.info(`Ephemeral URL generated, sending to system. URL: ${ephemeralURL}`);
            await awsIOTService.publishMessageToDevice(systemID, 1, message, false);
        }
        else {
            throw Error("Could not serve file");
        }
    } catch (err) {
        logger.error(`Cannot serve file: ${err}`);
        const message = {
            command: "err",
            message: "An error occurred while processing your request"
        };
        await awsIOTService.publishMessageToDevice(systemID, 1, message, false);
    } finally {
        await redisService.releaseS3Lock();
    }
}

async function processSystemShellResponse(thingID, message) {
    logger.info(`Shell response from thing ID ${thingID} publishing: ${message}`);
    await redisService.pubToSystem(redisService.REDIS_KEYS.SYSTEM_SHELL_RESPONSES, thingID, JSON.stringify({"message": message }));
}

async function processGetRand(thingID, file, offset) {
    logger.info("Generating 512KB of random data");
    await processSystemDataRequest(thingID, `rand${file}`, offset, async function() {
        const size = 1024 * 512; // 512Kb in bytes
        const randomData = Buffer.alloc(size);

        for (let i = 0; i < size; i++) {
            randomData[i] = Math.floor(Math.random() * 256);
        }
        return randomData;
    });
}

async function processSystemGetFWManifest(thingID, file, offset) {
    logger.info(`Getting FW manifest, file ${file}, offset ${offset}`);
    await processSystemDataRequest(thingID, `fw_man${file}`, offset, async function() {
        const fwMan = await systemService.getFirmwareManifest(file);
        if (!fwMan) {
            throw Error("Could not access firmware manifest");
        }
        return JSON.stringify(fwMan.hash_content);
    });
}

async function processSystemGetFirmware(thingID, firmwareInfo, offset) {
    logger.info("Starting firmware file retrieval");
    if (firmwareInfo.source === "glg") {
        await processSystemDataRequest(thingID, `fw${firmwareInfo.firmware_id}`, offset, async function() {
            return await glgService.downloadFirmwareRevision(firmwareInfo.revision, firmwareInfo.file);
        });
    }
    else if (firmwareInfo.source === "gh") {
        await processSystemDataRequest(thingID, `fw${firmwareInfo.firmware_id}`, offset, async function() {
            return await ghService.downloadFirmwareRevision(firmwareInfo.org, firmwareInfo.repo, firmwareInfo.tag, firmwareInfo.file);
        });
    }
}

async function processSystemGetFile(thingID, file, type, offset) {
    logger.info(`Thing ID: ${thingID} requesting ${type} file, file_id ${file}, offset: ${offset}`);
    if (type === "fw") {
        const firmwareInfo = await systemService.getFirmware(0, file);
        if (!firmwareInfo || firmwareInfo.length === 0) {
            throw Error("Could not find firmware requested");
        }
        await processSystemGetFirmware(thingID, firmwareInfo[0], offset);
    }
    else if (type === "fw_man") {
        await processSystemGetFWManifest(thingID, file, offset);
    }
    else if (type === "rand") {
        await processGetRand(thingID, file, offset);
    }
}

async function getSystemSIMDetails(req, res, next) {
    const sim = res.locals.data.sim;

    //simbase uses the last digit as a CRC, but API doesnt expect it
    const adjustedSim = sim.length > 19 ? sim.slice(0, -1) : sim;
    logger.info(`Getting System SIM Details for ${adjustedSim}`);
    simbaseService.getSIMDetails(res,
        adjustedSim, function(results) {
        res.json(results);
    },
    function(err) {
        logger.info(`ERR getting system SIM details: ${err}`);
        next(err);
    });
}

async function sendShellCommand(req, res, next) {
    try {
        const system = res.locals.data.system;
        const command = res.locals.data.command;
        const retain = res.locals.data.retain;
        logger.info(`Sending shell command to ${system}: ${command}. Retain: ${retain}`);
        const message = {
            command: "shell",
            message: command
        };
        await awsIOTService.publishMessageToDevice(system, 1, message, retain);
        res.json({message: "command sent"});
    }
    catch (err) {
        logger.error(`ERR sending shell command: ${err}`);
        next(err);
    }
}

async function observeSystemShell(req, res) {
    const system = req.header("system");
    if (system) {
        logger.info(`Client opened shell to system: ${system}`);
        const clientId = Date.now();
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Connection": "keep-alive",
            "Cache-Control": "no-cache"
        });

        //redisService.subToSystem(redisService.REDIS_KEYS.GATEWAY_SHELL_RESPONSES, system, newClient).catch(err => {
        //    logger.info(`ERR opening system shell: ${err}`);
        //    next(err);
        //});

        req.on("close", () => {
            logger.info(`${clientId} Shell Connection closed`);
            //redisService.unsubFromSystem(redisService.REDIS_KEYS.GATEWAY_SHELL_RESPONSES, system, clientId);
        });
    } else {
        logger.error("Error subscribing to system shell responses");
        res.status(400).send("Bad Request");
    }
}

module.exports = {
	getSystems,
    getSystem,
    getNumSystems,
    setFleet,
    getDevice,
    modifySystem,
    getSystemShadow,
    processSystemShellResponse,
    processSystemGetFile,
    getSystemMetrics,
    storeSystemMetrics,
    getSystemSIMDetails,
    sendShellCommand,
    observeSystemShell
};
