"use strict";
const userService = require("../services/user.service");
const redisService = require( "../services/redis.service.js");
const { StatusCodes } = require("http-status-codes");
const logger = require("../logger");

async function getUsers(req, res, next) {
    logger.info(`Getting users, idx: ${res.locals.data.index}`);
    try {
        const users = await userService.getUsers(res.locals.data.index);
        logger.info("Users retrieved successfully");
        res.status(StatusCodes.OK);
        res.json(users);
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting users ${err.message}`);
        next(err);
    }
}

async function getNumberUsers(req, res, next) {
    logger.info("Getting num users");
    try {
        const numUsers = await userService.getNumUsers();
        res.status(StatusCodes.OK);
        res.json(numUsers);
        logger.info("User count retrieved successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting number of users ${err.message}`);
        next(err);
    }
}

async function setUserGroup(req, res, next) {
    logger.info(`Setting user group, id: ${res.locals.data.name}, groupId: ${res.locals.data.groupId}`);
    try {
        await userService.setUsersGroup(res.locals.data.name,
            res.locals.data.groupId);
        logger.info("user updated successfully, wiping cached permissions");
        await redisService.clearKey(redisService.REDIS_KEYS.PERMISSIONS, res.locals.data.name);
        res.status(StatusCodes.OK);
        res.send();
        logger.info("User group set successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error updating user ${err.message}`);
        next(err);
    }
}

async function deleteUser(req, res, next) {
    logger.info(`Deleting user, id: ${res.locals.data.id}`);
    try {
        await userService.deleteUser(res.locals.data.id);
        res.status(StatusCodes.OK);
        res.send();
        logger.info("User deleted successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error deleting users ${err.message}`);
        next(err);
    }
}

async function getPermissions(req, res, next) {
    logger.info("Getting all permissions");
    try {
        const permissions = await userService.getAllPermissions();
        res.status(StatusCodes.OK);
        res.json(permissions);
        logger.info("All permissions retrieved successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error getting permissions ${err.message}`);
        next(err);
    }
}

async function getNumberUserGroups(req, res, next) {
    logger.info("Getting number of user groups");
    try {
        const numUserGroups = await userService.getNumUserGroups();
        res.status(StatusCodes.OK);
        res.json(numUserGroups);
        logger.info("Retrieved number of user groups successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error retrieving number of user groups ${err.message}`);
        next(err);
    }
}

async function getUserGroups(req, res, next) {
    logger.info("Getting user groups");
    try {
        const userGroups = await userService.getUserGroups();
        res.status(StatusCodes.OK);
        res.json(userGroups);
        logger.info("Retrieved user groups successfully");
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error retrieving user groups ${err.message}`);
        next(err);
    }
}

async function createUserGroup(req, res, next) {
    logger.info(`Creating a user group, name: ${res.locals.data.name}`);
    try {
        await userService.createUserGroup(res.locals.data.name);
        res.status(StatusCodes.OK);
        res.send();
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error creating user group ${err.message}`);
        next(err);
    }
}

async function editUserGroup(req, res, next) {
    logger.info(`Editing user group, id: ${res.locals.data.id}, permissions: ${res.locals.data.permissions}`);
    try {
        await userService.editUserGroup( res.locals.data.id,
            res.locals.data.permissions);
        const usersInGroup = await userService.getUsersInGroup(res.locals.data.id);
        if (usersInGroup) {
            logger.info(`user group edited successfully, wiping cached permissions for ${usersInGroup.length} users`);
            for (const userInGroup of usersInGroup) {
                await redisService.clearKey(redisService.REDIS_KEYS.PERMISSIONS, userInGroup.user);
            }
        }
        res.status(StatusCodes.OK);
        res.send();
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error editing user group ${err.message}`);
        next(err);
    }
}

async function deleteUserGroup(req, res, next) {
    logger.info(`Deleting user group, id: ${res.locals.data.id}`);
    try {
        const usersInGroup = await userService.getUsersInGroup(res.locals.data.id);
        if (usersInGroup.length > 0) {
            throw new Error("User group not empty");
        }

        await userService.deleteUserGroup( res.locals.data.id);
        res.status(StatusCodes.OK);
        res.send();
    } catch (err) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE);
        logger.error(`Error deleting user group ${err.message}`);
        next(err);
    }
}

module.exports = {
    getUsers,
	getNumberUsers,
    setUserGroup,
    deleteUser,
    getPermissions,
    getNumberUserGroups,
    getUserGroups,
    createUserGroup,
    editUserGroup,
    deleteUserGroup
};
