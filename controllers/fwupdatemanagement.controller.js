"use strict";
const greenlightGuruService = require("../services/greenlightguru.service");
const githubService = require("../services/github.service");
const { StatusCodes } = require("http-status-codes");
const systemService = require("../services/system.service.js");
const logger = require("../logger");

async function getGroups(req, res, next) {
    logger.info(`Getting groups, idx: ${res.locals.data.index}`);
    try {
        let groupEntries = await systemService.getGroups(res.locals.data.index, res.locals.data.groupID);
        logger.info("Groups retrieved successfully");
        if (res.locals.data.populateFleets) {
            logger.info("Querying for fleets with Group");
            groupEntries = await Promise.all(
                groupEntries.map(async (group) => {
                    const fleets = await systemService.getFleetsWithGroup(group);
                    return {
                        ...group.toObject(),
                        fleets: fleets
                    };
                })
            );
        }
        res.status(StatusCodes.OK);
        res.json(groupEntries);
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting groups ${err.message}`);
        next(err);
    }
}

async function getNumberGroups(req, res, next) {
    logger.info("Getting num groups");
    try {
        const numGroups = await systemService.getNumberGroups(res.locals.data.groupID);
        res.status(StatusCodes.OK);
        res.json(numGroups);
        logger.info("Group count retrieved successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting number of group ${err.message}`);
        next(err);
    }
}

async function getFirmware(req, res, next) {
    logger.info(`Getting firmware, idx: ${res.locals.data.index}`);
    try {
        let firmwareEntries = await systemService.getFirmware(res.locals.data.index, res.locals.data.firmwareID);
        logger.info("Firmware retrieved successfully");
        if (res.locals.data.populateFleets) {
            logger.info("Querying for fleets with firmware");
            firmwareEntries = await Promise.all(
                firmwareEntries.map(async (firmware) => {
                    const fleets = await systemService.getFleetsWithFirmware(firmware);
                    return {
                        ...firmware.toObject(),
                        fleets: fleets
                    };
                })
            );
        }
        res.status(StatusCodes.OK);
        res.json(firmwareEntries);
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting firmware ${err.message}`);
        next(err);
    }
}

async function saveFirmware(req, res, next) {
  const { source, firmwareID, description, file, index } = res.locals.data;
  logger.info(`Firmware save request. Src: ${source}, firmwareID: ${firmwareID}, description: ${description}, file: ${file}`);

  try {
    const existingFirmware = await systemService.getFirmware(index, firmwareID);
    if (existingFirmware.length > 0) {
      logger.info(`Duplicate firmware ID: ${firmwareID}`);
      res.status(StatusCodes.CONFLICT).send({
        message: `Duplicate firmware ID: ${firmwareID}`,
        firmwareID: firmwareID,
      });
    }
    else {
      if (source === "glg") {
        const { revisionID } = res.locals.data;
        logger.info(`GLG revision: ${revisionID}`);

        const matchedFirmware = await systemService.getFirmwareID(source, revisionID, undefined, undefined, undefined, file);
        if (matchedFirmware) {
          logger.info(`Firmware already saved: ${matchedFirmware.firmware_id}`);
          res.status(StatusCodes.CONFLICT).send({
            message: "Firmware already saved",
            firmwareID: matchedFirmware.firmware_id,
          });
        }
        else {
          const glgFirmware = await greenlightGuruService.checkFirmwareExists(revisionID, file);
          if (!glgFirmware) {
            res.status(StatusCodes.NOT_FOUND).send({ message: "GLG Firmware not found" });
          }
          else {
            await systemService.saveFirmware(firmwareID, description, source, revisionID, undefined, undefined, undefined, file);
            logger.info("Firmware saved successfully");
            res.status(StatusCodes.OK).json({ message: "Firmware saved", firmwareID: firmwareID });
          }
        }
      }
      else if (source === "gh") {
        const { org, repo, tag } = res.locals.data;
        logger.info(`GH org: ${org}, repo: ${repo}, tag: ${tag}`);

        const matchedFirmware = await systemService.getFirmwareID(source, undefined, org, repo, tag, file);
        if (matchedFirmware) {
          logger.info(`Firmware already saved: ${matchedFirmware.firmware_id}`);
          res.status(StatusCodes.CONFLICT).send({
            message: "Firmware already saved",
            firmwareID: matchedFirmware.firmware_id,
          });
        }
        else {
          const ghFirmware = await githubService.checkFirmwareExists(org, repo, tag, file);
          if (!ghFirmware) {
            res.status(StatusCodes.NOT_FOUND).send({ message: "GH Firmware not found" });
          }
          else {
            await systemService.saveFirmware(firmwareID, description, source, undefined, org, repo, tag, file);
            logger.info("Firmware saved successfully");
            res.status(StatusCodes.OK);
            res.json({ message: "Firmware saved", firmwareID: firmwareID });
          }
        }
      }
    }

    //input sanitation will prevent other source inputs
  } catch (err) {
    res.status(StatusCodes.SERVICE_UNAVAILABLE);
    logger.error(`Error saving firmware: ${err.message}`);
    next(err);
  }
}

async function saveGroup(req, res) {
  const { groupID, description } = res.locals.data;
  logger.info(`Group save request, groupID: ${groupID}, description: ${description}`);

  try {
    const existingGroup = await systemService.getDeviceGroup(groupID);
    if (existingGroup) {
      logger.info(`Duplicate group ID: ${groupID}`);
      return res.status(StatusCodes.CONFLICT).send({
        message: `Duplicate group ID: ${groupID}`,
        groupID: groupID,
      });
    }
    await systemService.saveGroup(groupID, description);
    logger.info("Group saved successfully");
    return res.status(StatusCodes.OK).json({ message: "Group saved", groupID: groupID });
  } catch (err) {
    logger.error(`Error saving group: ${err.message}`);
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).send({ message: "Error saving group", error: err.message });
  }
}

async function saveFleet(req, res) {
  const { fleetID, description } = res.locals.data;
  logger.info(`Fleet save request, fleetID: ${fleetID}, description: ${description}`);

  try {
    const existingFleet = await systemService.getFleet(fleetID, false);
    if (existingFleet) {
      logger.info(`Duplicate fleet ID: ${fleetID}`);
      return res.status(StatusCodes.CONFLICT).send({
        message: `Duplicate fleet ID: ${fleetID}`,
        fleetID: fleetID,
      });
    }
    await systemService.saveFleet(fleetID, description);
    logger.info("Fleet saved successfully");
    return res.status(StatusCodes.OK).json({ message: "Fleet saved", fleetID: fleetID });
  } catch (err) {
    logger.error(`Error saving fleet: ${err.message}`);
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).send({ message: "Error saving fleet", error: err.message });
  }
}

async function getNumberFirmware(req, res, next) {
    logger.info("Getting num firmware");
    try {
        const numFirmware = await systemService.getNumberFirmware(res.locals.data.firmwareID);
        res.status(StatusCodes.OK);
        res.json(numFirmware);
        logger.info("Firmware count retrieved successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting number of firmware ${err.message}`);
        next(err);
    }
}

async function getFleet(req, res, next) {
    logger.info(`Getting fleet, id: ${res.locals.data.fleetID}`);
    try {
        const fleet = await systemService.getFleet(res.locals.data.fleetID, true);
        if (!fleet) {
            throw new Error(`Fleet not found: ${res.locals.data.fleetID}`);
        }
        logger.info("Fleet retrieved successfully");
        res.status(StatusCodes.OK);
        res.json(fleet);
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting fleet ${err.message}`);
        next(err);
    }
}

async function getFleets(req, res, next) {
    logger.info(`Getting fleets, idx: ${res.locals.data.index}`);
    try {
        const fleets = await systemService.getFleets(res.locals.data.index);
        logger.info("Fleets retrieved successfully");
        res.status(StatusCodes.OK);
        res.json(fleets);
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting fleets ${err.message}`);
        next(err);
    }
}

async function modifyFleet(req, res, next) {
    logger.info(`Updating fleet, idx: ${JSON.stringify(res.locals.data.fleetID)}, modifications: ${JSON.stringify(res.locals.data.modifications)}`);
    try {
        for (const mod of res.locals.data.modifications) {
            // eslint-disable-next-line camelcase
            const { group_id, firmware_id } = mod;
            await systemService.modifyFleetEntry(res.locals.data.fleetID, group_id, firmware_id);
        }
        await systemService.setDirtyBitForFleet(res.locals.data.fleetID);
        logger.info("Fleets updated successfully");
        res.status(StatusCodes.OK);
        res.send();
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error updating fleets ${err.message}`);
        next(err);
    }
}

async function getNumberFleets(req, res, next) {
    logger.info("Getting num fleet");
    try {
        const numFleets = await systemService.getNumFleets();
        res.status(StatusCodes.OK);
        res.json(numFleets);
        logger.info("Fleet count retrieved successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting number of fleet ${err.message}`);
        next(err);
    }
}

module.exports = {
  getGroups,
  getNumberGroups,
  saveFirmware,
  getFirmware,
  saveGroup,
  saveFleet,
  getNumberFirmware,
  getFleet,
  getNumberFleets,
  getFleets,
  modifyFleet
};
