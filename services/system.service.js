"use strict";
const SystemSchema = require("../model/w200/systems-template");
const SystemMetrics = require("../model/w200/system-metrics-template");
const DeviceSchema = require("../model/w200/device-template");
const DeviceLogsSchema = require("../model/w200/device-logs-template");
const SystemFleetSchema = require("../model/w200/fleet-template");
const DeviceFirmwareSchema = require("../model/w200/firmware-template");
const StateRecordSchema = require("../model/w200/state-record-template");
const GroupSchema = require("../model/w200/group-template");
const MurmurHash3 = require("imurmurhash");
const logger = require("../logger");

// Function to escape regex characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

async function getFirmwareID(source, revision, org, repo, tag, file) {
    logger.info(`Checking if firmware exists,
        src: ${source}, 
        revision: ${revision}, 
        org: ${org}, 
        repo: ${repo}, 
        tag: ${tag}, 
        file: ${file}`);
    let firmware = null;
    if (source === "glg") {
        firmware = await DeviceFirmwareSchema.findOne({
            source: source,
            revision: revision,
            file: file
        });
    }
    if (source === "gh") {
        firmware = await DeviceFirmwareSchema.findOne({
            source: source,
            org: org,
            repo: repo,
            tag: tag,
            file: file
        });
    }
    return firmware;
}

async function saveFirmware(firmwareID, firmwareDesc, source, revision, org, repo, tag, file) {
    logger.info(`Saving firmware:
        ID: ${firmwareID}, 
        desc: ${firmwareDesc}, 
        src: ${source}, 
        revision: ${revision}, 
        org: ${org}, 
        repo: ${repo}, 
        tag: ${tag}, 
        file: ${file}`);
    let newFirmware = null;
    try {
        if (source === "glg") {
            newFirmware = new DeviceFirmwareSchema({
                firmware_id: firmwareID,
                firmware_desc: firmwareDesc,
                source: source,
                revision: revision,
                file: file
            });
        }
        if (source === "gh") {
            newFirmware = new DeviceFirmwareSchema({
                firmware_id: firmwareID,
                firmware_desc: firmwareDesc,
                source: source,
                org: org,
                repo: repo,
                tag: tag,
                file: file
            });
        }
        const savedFirmware = await newFirmware.save();
        if (!savedFirmware) {
            throw new Error("Unable to save document");
        }
        logger.info("Firmware created");
    } catch (error) {
        logger.error("Error saving firmware:", error);
    }
}

async function saveGroup(groupID, groupDesc) {
    logger.info(`Saving group:
        ID: ${groupID}, 
        desc: ${groupDesc}`);
    try {
        const newGroup = new GroupSchema({
            group_id: groupID,
            group_desc: groupDesc
        });
        const savedGroup = await newGroup.save();
        if (!savedGroup) {
            throw new Error("Unable to save document");
        }
        logger.info("Group created");
    } catch (error) {
        logger.error("Error saving group:", error);
    }
}

async function saveFleet(fleetID, fleetDesc) {
    logger.info(`Saving fleet:
        ID: ${fleetID}, 
        desc: ${fleetDesc}`);
    try {
        const newFleet = new SystemFleetSchema({
            fleet_name: fleetID,
            fleet_description: fleetDesc
        });
        const savedFleet = await newFleet.save();
        if (!savedFleet) {
            throw new Error("Unable to save document");
        }
        logger.info("Fleet created");
    } catch (error) {
        logger.error("Error saving fleet:", error);
    }
}

async function getFirmware(index, firmwareID) {
    logger.info("Pulling firmware");
    let query = DeviceFirmwareSchema.find();
    if (firmwareID) {
        query.where("firmware_id").regex(new RegExp(escapeRegex(firmwareID), "i"));
    }
    return await query.skip(index).sort("-_id").limit(10).exec();
}

async function getNumberFirmware(firmwareID) {
    logger.info("Pulling firmware count");
    let query = DeviceFirmwareSchema.count();
     if (firmwareID) {
        query.where("firmware_id").regex(new RegExp(escapeRegex(firmwareID), "i"));
    }
    return await query.exec();
}

async function getGroups(index, groupID) {
    logger.info("Pulling firmware");
    let query = GroupSchema.find();
     if (groupID) {
        query.where("group_id").regex(new RegExp(escapeRegex(groupID), "i"));
    }
    return await query.skip(index).sort("-_id").limit(10).exec();
}

async function getNumberGroups(groupID) {
    logger.info("Pulling group count");
    let query = GroupSchema.count();
     if (groupID) {
        query.where("group_id").regex(new RegExp(escapeRegex(groupID), "i"));
    }
    return await query.exec();
}

async function getFleet(fleetID, queryNumDevices) {
    logger.info(`Pulling fleet: ${fleetID}`);
    const fleet = await SystemFleetSchema.findOne({ fleet_name: fleetID});
    if (!fleet) {
        return null;
    }
    if (queryNumDevices) {
        const assignedSystems = await SystemSchema.countDocuments({ fleet: fleet._id });
        return {
            ...fleet.toObject(),
            assignedSystems
        };
    }
    else {
        return fleet;
    }
}

async function changeSystemFleet(systemID, fleetID) {
    logger.info(`Changing system: ${systemID} fleet to: ${fleetID}`);
    try {
        const result = await SystemSchema.findOneAndUpdate(
            { system_name: systemID },
            { fleet: fleetID, dirty_flag: true });
        if (result) {
            logger.info("System fleet updated successfully.");
            return result;
        } else {
            throw new Error("Unable to update system fleet");
        }
    } catch (error) {
        logger.error(`Error updating system fleet: ${error}`);
        throw error; // Rethrow to handle in calling function
    }
}

async function getFleetsWithGroup(group) {
    logger.info(`Getting fleets with group: ${group._id}`);
    const fleetsWithFirmware = await SystemFleetSchema.find({
        device_groups: {
            $elemMatch: {
                group: group._id
            }
        }
    });
    return fleetsWithFirmware;
}


async function getFleetsWithFirmware(firmware) {
    logger.info(`Getting fleets with firmware: ${firmware._id}`);
    const fleetsWithFirmware = await SystemFleetSchema.find({
        device_groups: {
            $elemMatch: {
                firmware: firmware._id
            }
        }
    });
    return fleetsWithFirmware;
}

async function getFleets(index) {
    logger.info("Pulling fleets");

    // Fetch paginated fleets
    const fleets = await SystemFleetSchema.find()
        .skip(index)
        .sort("-_id") // deterministic order
        .limit(10)
        .exec();

    // For each fleet, fetch and attach assigned device count
    const fleetsWithCounts = await Promise.all(
        fleets.map(async fleet => {
            const assignedSystems = await SystemSchema.countDocuments({ fleet: fleet._id });
            return {
                ...fleet.toObject(),
                assignedSystems
            };
        })
    );
    return fleetsWithCounts;
}

async function modifyFleetEntry(fleetID, groupID, firmwareID) {
    logger.info(`Modifying fleet: ${fleetID} with group: ${groupID} and firmware: ${firmwareID}`);
    // Fetch paginated fleets
    const fleet = await getFleet(fleetID, false);
    if (!fleet) {
        throw new Error(`Fleet not found: ${fleetID}`);
    }
    const firmwareRequested = await getFirmware(0, firmwareID);
    if (!firmwareRequested || firmwareRequested.length === 0) {
        throw new Error(`Firmware not found: ${firmwareID}`);
    }

    const groupEntry = fleet.device_groups.find(entry =>
        groupID === `${entry.group.group_id}`
    );
    if (groupEntry) {
        logger.info("Fleet modified successfully, group firmware modified");
        groupEntry.firmware = firmwareRequested[0]._id;
    }
    else {
        const groupRequested = await GroupSchema.findOne({ group_id: groupID});
        if (!groupRequested) {
            throw new Error(`Group not found: ${groupID}`);
        }
        logger.info("Fleet modified successfully, group firmware added");
        fleet.device_groups.push({
            group: groupRequested._id,
            firmware: firmwareRequested[0]._id
        });
    }
    logger.info("Saving fleet");
    await fleet.save();
}

async function getFirmwareManifest(curSysFleetHash) {
    logger.info(`Getting firmware manifest: ${curSysFleetHash}`);
    try {
        return await StateRecordSchema.findOne({ state_hash: curSysFleetHash, state_type: "fleetgroups" });
    } catch (error) {
        logger.error(`Error updating system metrics: ${error}`);
        throw error; // Rethrow to handle in calling function
    }
}

async function createStateRecord(contentArray, recordType) {
    logger.info(`Assembling state record of type: ${recordType}`);
    if (!contentArray || !Array.isArray(contentArray)) {
        throw new Error("Invalid or missing 'content_array' array");
    }

    // Step 1: Create a hash for each device group
    let hashedContent = [];
    const groupHashes = contentArray.map(innerArray => {
        const concatenated = innerArray.join("|");
        hashedContent.push(concatenated);
        return MurmurHash3(concatenated).result();
    });

    const sortedHashes = groupHashes.sort((a, b) => a - b);

    const finalInput = sortedHashes.join("");

    const finalHash = MurmurHash3(finalInput).result().toString();

    // Step 3: Try to insert only if not exists
    const result = await StateRecordSchema.updateOne(
        { state_hash: finalHash, state_type: recordType },
        {
            $setOnInsert: {
                state_hash: finalHash,
                state_type: recordType,
                hash_content: hashedContent
            }
        },
        { upsert: true }
    );

    if (result.upsertedCount > 0) {
        logger.info("Inserted new StateRecord with hash: ", finalHash);
    } else {
        logger.info("StateRecord already exists. No insert performed.");
    }
    return finalHash;
}

async function getNumFleets() {
    logger.info("Pulling fleets");
    return await SystemFleetSchema.count();
}

async function getDirtySystems(index, number) {
    logger.info(`Getting dirty systems, amount: ${number}`);
	try {
        return await SystemSchema.find({
            dirty_flag: true
        }).skip(index).sort("-_id").limit(number);
    } catch (error) {
        logger.error(`Error retrieving dirty systems: ${error}`);
        return undefined;
    }
}

async function setDirtyBitForFleet(fleetId) {
    logger.info(`Setting dirty flag for systems enrolled in fleet ${fleetId}`);
    const fleet = await getFleet(fleetId, false);
    if (!fleet) {
        throw new Error(`Fleet not found: ${fleetId}`);
    }
    const result = await SystemSchema.updateMany({fleet: fleet._id}, {
		dirty_flag: true
	});
    if (!result.acknowledged) {
        throw new Error(`Could not modify dirty bit for systems under fleet, result: ${JSON.stringify(result)}`);
    }
}

async function updateDirtyBit(systemName, value) {
    logger.info(`Setting: ${systemName} dirty flag to: ${value}`);
    const result = await SystemSchema.updateOne({system_name: systemName}, {
		dirty_flag: value
	});
    if (!result.acknowledged) {
        throw new Error(`Could not modify dirty bit for system, result: ${JSON.stringify(result)}`);
    }
}

async function getNextSystemName() {
    const PREFIX = "W200-";
    const NUM_LENGTH = 11;

    // Find the system with the highest number
    const latestSystem = await SystemSchema.findOne({ system_name: new RegExp(`^${PREFIX}\\d{${NUM_LENGTH}}$`) })
        .sort({ system_name: -1 }) // Sort descending
        .collation({ locale: "en_US", numericOrdering: true }); // Ensure numeric sort

    let nextNumber = 1;

    if (latestSystem && latestSystem.system_name) {
        const currentNumber = parseInt(latestSystem.system_name.replace(PREFIX, ""), 10);
        nextNumber = currentNumber + 1;
    }

    return `${PREFIX}${String(nextNumber).padStart(NUM_LENGTH, "0")}`;
}

async function createSystem(fleetId) {
    logger.info(`Adding system under fleet ${fleetId}`);

    const fleetRequested = await SystemFleetSchema.findOne({ fleet_name: fleetId });
    if (!fleetRequested) {
        throw new Error(`Fleet not found: ${fleetId}`);
    }
    const systemName = await getNextSystemName();

    const newSystem = await SystemSchema.create({
        system_name: systemName,
        fleet: fleetRequested._id,
        active: true,
        dirty_flag: true
    });

    if (!newSystem || !newSystem._id) {
        throw new Error("Unable to add system");
    } else {
        logger.info(`System added, system name: ${systemName}`);
    }
    return systemName;
}
async function getDeviceGroup(groupId) {
    logger.info(`Retrieving group: ${groupId}`);
    const groupDoc = await GroupSchema.findOne({
        group_id: groupId
    });
    if (!groupDoc) {
        logger.info(`Group not found for ID: ${groupId}`);
        return undefined;
    }
    return groupDoc;
}

async function createDevice(deviceId, systemId, groupId, thingId, type) {
    logger.info(`Adding device: ${deviceId}, system: ${systemId}, update group: ${groupId}, thing id: ${thingId}, type: ${type}`);

    const deviceExists = await DeviceSchema.countDocuments({ device_id: deviceId });
    if (deviceExists > 0) {
        throw new Error(`Device already exists: ${deviceId}`);
    }

    const systemRequested = await SystemSchema.findOne({ system_name: systemId });
    if (!systemRequested) {
        throw new Error(`System not found: ${systemId}`);
    }

    const newDevice = await DeviceSchema.create({
        device_id: deviceId,
        system: systemRequested._id,
        update_group: groupId,
        active: true,
        thing_id: thingId,
        type: type,
        current_firmware: "N/A"
    });

    if (!newDevice || !newDevice._id) {
        throw new Error("Unable to add device");
    } else {
        logger.info("Device added");
    }
}

async function addDeviceToSystem(systemName, deviceId) {
    logger.info(`Adding device: ${deviceId} to system: ${systemName}`);
    const system = await SystemSchema.findOne({system_name: systemName});
    if (!system) {
        throw new Error(`System not found: ${systemName}`);
    }
    const response = await DeviceSchema.updateOne({device_id: deviceId},
        { system: system._id }
    );
    if (response.modifiedCount === 0) {
        throw new Error("Unable to modify device");
    }
    else {
        logger.info("System adjusted");
    }
}

async function removeDeviceFromSystem(systemName, deviceId) {
    logger.info(`Removing device: ${deviceId} from system: ${systemName}`);
    logger.info("TODO - to be implemented");
}

async function getSystems(index, systemID, fleetID) {
    logger.info(`Getting systems, index: ${index}`);

    let query = SystemSchema.find();
    if (systemID) {
        query.where("system_name").regex(new RegExp(escapeRegex(systemID), "i"));
    }
    if (fleetID) {
        const fleet = await getFleet(fleetID, false);
        if (!fleet) {
            throw new Error(`Fleet not found: ${fleetID}`);
        }
        query.where("fleet", fleet._id);
    }
    return await query.skip(index).sort("-_id").limit(10).exec();
}

async function getNumSystems(systemID, fleetID) {
    logger.info("Getting number of systems");
    let query = SystemSchema.count();
    if (systemID) {
        query.where("system_name").regex(new RegExp(escapeRegex(systemID), "i"));
    }
    if (fleetID) {
        const fleet = await getFleet(fleetID, false);
        if (!fleet) {
            throw new Error(`Fleet not found: ${fleetID}`);
        }
        query.where("fleet", fleet._id);
    }
    return await query.exec();
}

async function getDevicesForSystem(systemId) {
    return await DeviceSchema.find({ system: systemId });
}

async function getSystem(systemID) {
    logger.info(`Getting system metrics for system: ${systemID}`);
    try {
        const systemDoc = await SystemSchema.findOne({
            system_name: systemID
        });
        if (!systemDoc) {
            logger.warn(`System not found for ID: ${systemID}`);
            return undefined;
        }

        const devices = await getDevicesForSystem(systemDoc._id);

        const system = systemDoc.toObject();
        system.devices = devices;

        return system;
    } catch (error) {
        logger.error(`Error retrieving system metrics: ${error}`);
        return undefined;
    }
}

async function getSystemFromThingID(thingID) {
    logger.info(`Getting system associated with thing ID: ${thingID}`);
    try {
        const deviceDoc = await DeviceSchema.findOne({
            thing_id: thingID
        });
        if (!deviceDoc) {
            logger.warn(`Device not found for thing ID: ${thingID}`);
            return undefined;
        }
        return await getSystem(deviceDoc.system.system_name);
    } catch (error) {
        logger.error(`Error retrieving system: ${error}`);
        return undefined;
    }
}

async function getDevice(deviceID) {
    logger.info(`Getting device metrics for device: ${deviceID}`);
    try {
        const deviceDoc = await DeviceSchema.findOne({
            device_id: deviceID
        });
        if (!deviceDoc) {
            logger.info(`Device not found for ID: ${deviceID}`);
            return undefined;
        }

        const deviceLogs = await DeviceLogsSchema.find({ creatorId: deviceID });

        const device = deviceDoc.toObject();
        logger.info(`Device test printout: ${JSON.stringify(device)}`);
        device.logs = deviceLogs;

        return device;
    } catch (error) {
        logger.error(`Error retrieving device metrics: ${error}`);
        return undefined;
    }
}

async function storeSystemMetrics(systemID, thingID, record) {
    logger.info(`Storing system metrics for system ${systemID} from thing ${thingID}. Data: ${JSON.stringify(record)}`);
    const filter = {
        system_name: systemID
    };
    const update = {
        ...record,
        system_name: systemID,
        thingID: thingID,
        lastUpdatedTimestamp: Date.now()
    };
    const options = { new: true, upsert: true };

    try {
        const result = await SystemMetrics.findOneAndUpdate(filter, update, options);
        if (result) {
            logger.info("System metrics updated successfully.");
            return result;
        } else {
            logger.error("System metric save failed");
            throw Error("System metric save failed");
        }
    } catch (error) {
        logger.error(`Error updating system metrics: ${error}`);
        throw error;
    }
}

async function getSystemMetrics(systemID) {
    logger.info(`Getting system metrics for system ${systemID}`);
    try {
        return await SystemMetrics.findOne({ system_name: systemID });
    } catch (error) {
        logger.error(`Error retrieving system metrics: ${error}`);
        throw error;
    }
}

module.exports = {
    getFirmwareID,
    saveFirmware,
    saveGroup,
    saveFleet,
    getFirmware,
    getNumberFirmware,
    getGroups,
    getNumberGroups,
    getFleet,
    changeSystemFleet,
    getFleetsWithGroup,
    getFleetsWithFirmware,
    getFleets,
    modifyFleetEntry,
    getFirmwareManifest,
    createStateRecord,
    getDirtySystems,
    updateDirtyBit,
    createSystem,
    getDeviceGroup,
    createDevice,
    addDeviceToSystem,
    removeDeviceFromSystem,
    getNumFleets,
    getSystems,
    getNumSystems,
    storeSystemMetrics,
    getSystemMetrics,
    setDirtyBitForFleet,
    getDevicesForSystem,
    getSystem,
    getSystemFromThingID,
    getDevice
};
