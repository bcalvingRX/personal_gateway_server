"use strict";
const systemService = require("../services/system.service.js");
const awsIOTService = require("../services/aws.iot.service");
const { StatusCodes } = require("http-status-codes");
const logger = require("../logger");

async function provisionSystem(req, res, next) {
    const fleet = res.locals.data.fleetID;
    const devices = res.locals.data.devices;
    try {
        logger.info(`Provisioning new system with ${devices.length} devices, assigned to fleet ${fleet}`);
        if (!Array.isArray(devices)) {
            throw new Error("Invalid device list format.");
        }
        let thingIdsPresent = 0;
        for (const device of devices) {
            const group = await systemService.getDeviceGroup(device.group_id);
            if (!group) {
                throw new Error(`Group doesn't exist: ${device.group_id}`);
            }

            const existing = await systemService.getDevice(device.device_id);
            if (existing) {
                throw new Error(`Device already exists: ${device.device_id}`);
            }
            if (device.thing_id) {
                thingIdsPresent = thingIdsPresent + 1;
            }

            device.group_id = group._id;
        }

        if (thingIdsPresent !== 1) {
            throw new Error("Exactly one device must have IOT thingID defined");
        }
        const systemName = await systemService.createSystem(fleet);

        for (const device of devices) {
            // eslint-disable-next-line camelcase
            const { device_id, group_id, thing_id, type } = device;
            // eslint-disable-next-line camelcase
            await systemService.createDevice(device_id, systemName, group_id, thing_id || null, type);
        }
        res.status(StatusCodes.OK).json({ newSystem: systemName });
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error provisioning new system ${err.message}`);
        next(err);
    }
}

async function processSystem(system) {
    const devicesInSystem = await systemService.getDevicesForSystem(system._id);
    const gateway = devicesInSystem.find(device => !!device.thing_id);
    if (gateway) {
        logger.info(`Thing name: ${gateway.thing_id }`);
        const deviceIds = devicesInSystem.map(device => [device.device_id]);
        const deviceHash = await systemService.createStateRecord(deviceIds, "devices");
        const validGroupIds = new Set(devicesInSystem
            .map(device => device.update_group?.group_id)
            .filter(groupId => groupId));
        const groupIDs = system.fleet.device_groups
            .filter(fleetGroup => validGroupIds.has(fleetGroup.group.group_id))
            .map(fleetGroup => [fleetGroup.group.group_id, fleetGroup.firmware.firmware_id]);
        const fleetHash = await systemService.createStateRecord(groupIDs, "fleetgroups");
        await awsIOTService.updateShadowPropertyForDevice(gateway.thing_id, ["DH", "FH"], [deviceHash, fleetHash]);
        await systemService.updateDirtyBit(system.system_name, false);
    }
    else {
        logger.warn(`Cannot process system updates for system ${system.system_name}, no IoT device assigned`);
    }
}

async function processDirtySystems(req, res, next) {
    logger.info("Starting processing of dirty systems");
    let totalProcessed = 0;
    let batchNumber = 0;
    const chunkSize = 50;

    try {
        while (true) {
            logger.info(`Fetching batch ${batchNumber + 1} of dirty systems...`);

            const dirtySystems = await systemService.getDirtySystems(batchNumber * 200, 200);

            if (!dirtySystems.length) {
                logger.info("No more dirty systems found.");
                break;
            }

            logger.info(`Processing ${dirtySystems.length} systems in batch ${batchNumber + 1}`);

            const workers = [];
            for (let i = 0; i < dirtySystems.length; i += chunkSize) {
                const chunk = dirtySystems.slice(i, i + chunkSize);

                const worker = async () => {
                    let processedCount = 0;
                    for (const system of chunk) {
                        try {
                            await processSystem(system);
                            logger.info(`(Worker ${Math.floor(i / chunkSize) + 1}) Processed system: ${system._id}`);
                            processedCount++;
                        } catch (err) {
                            logger.error(`(Worker ${Math.floor(i / chunkSize) + 1}) Error processing system ${system._id}: ${err}`);
                        }
                    }
                    return processedCount;
                };

                workers.push(worker());
            }

            // Wait for all chunk workers to finish
            const results = await Promise.all(workers);

            // Sum up successful results
            totalProcessed += results.reduce((sum, count) => sum + count, 0);
            batchNumber++;
        }

        logger.info(`Finished processing dirty systems. Total processed: ${totalProcessed}`);
        res.status(200).json({ message: "All dirty systems processed", totalProcessed });

    } catch (err) {
        logger.error(`Unexpected error during dirty system processing: ${err}`);
        next(err);
    }
}

module.exports = {
    provisionSystem,
    processDirtySystems
};
