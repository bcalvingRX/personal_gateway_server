"use strict";
const Users = require("../model/user");
const APIKey = require("../model/api-key");
const redisService = require( "./redis.service.js");
const Permissions = require("../model/gateway-permissions");
const UserGroup = require("../model/user-group");
const mongoose = require("mongoose");
const md5 = require("md5");
const logger = require("../logger");

async function checkForAPIKey(key) {
    logger.info("Checking API Key");
    const hashedKey = md5(key.toString());
	return await APIKey.exists({key: hashedKey});
}

async function getUsers(index) {
    logger.info("Pulling users");
    let query = Users.find().populate("group");
	query.skip(index);
	query.sort("-_id"); //sort by something, make limit deterministic
	query.limit(10);
    const users = await query.exec();
    return users;
}

async function getNumUsers() {
    logger.info("Pulling num users");
    return await Users.count();
}

async function doesUserExist(user) {
    logger.info("Checking if user exists");
    const userNum = await Users.count({user: user});
    const userExists = userNum > 0;
    logger.info(`User exists: ${userExists}`);
    return userExists;
}

async function doesUserGroupExist(userGroup) {
    logger.info("Checking if user exists");
    const userGroupNum = await UserGroup.count({name: userGroup});
    const userGroupExists = userGroupNum > 0;
    logger.info(`User group exists: ${userGroupExists}`);
    return userGroupExists;
}

async function getUserPermissions(user, updateCache) {
    let permissions;
    if (!updateCache) {
        const permissionsJSON = await redisService.getKey(redisService.REDIS_KEYS.PERMISSIONS, user);
        if (permissionsJSON) {
            permissions = JSON.parse(permissionsJSON);
        }
    }
    if (!permissions) {
        const userFound = await Users.findOne({ user: user }).populate("group").exec();

        if (!userFound) {
            throw new Error("No user found");
        }
        permissions = userFound.group.permissions;
        logger.info(`User ${user} in group: ${userFound.group.name}`);
        await redisService.setKey(redisService.REDIS_KEYS.PERMISSIONS, user, JSON.stringify(userFound.group.permissions));
    }
    return permissions;
}

async function createUser(user) {
    const userExists = await doesUserExist(user);
    if (!userExists) {
        const numberOfUsers = await getNumUsers(user);
        const createAdmin = numberOfUsers === 0;
        let assignedGroup;
        if (createAdmin) {
            logger.info(`Creating first new user:  ${user} with admin user group`);
            assignedGroup = await UserGroup.findOne({name: "Admin Group"});
        }
        else {
            logger.info(`Creating a new user:  ${user} with default user group`);
            assignedGroup = await UserGroup.findOne({name: "Default Group"});
        }
        if (!assignedGroup) {
            throw new Error("No initial group available!");
        }
        const newUser = new Users({
            user: user,
            group: new mongoose.Types.ObjectId(assignedGroup._id)
        });
        await newUser.save();
        logger.info("User created");
    }
    else {
        logger.info("User exists");
    }
}

async function setUsersGroup(user, group) {
    logger.info(`Setting: ${user} to group: ${group}`);
    const result = await Users.updateOne({user: user}, {
		group: new mongoose.Types.ObjectId(group),
	});
    if (result.modifiedCount !== 1) {
        throw new Error(`Could not modify requested user, result: ${JSON.stringify(result)}`);
    }
}

async function deleteUserGroup(id) {
    logger.info(`Deleting user group, id: ${id}`);
    //TODO: Check if any users assigned to group first
    const response = await UserGroup.deleteOne({ "_id": id, canDelete: true, canEdit: true});
    if (response.deletedCount === 0) {
        throw new Error("Could not delete requested group");
    }
}

async function getUsersInGroup(id) {
    logger.info(`Getting all users in group, id: ${id}`);
    const groupId = new mongoose.Types.ObjectId(id);
    return await Users.find({ "group": groupId }, "user");
}

function duplicatePermissions(permissions) {
    const seen = new Set();
    return permissions.some(item => {
      const key = `${item.name}-${item.location}`;
      if (seen.has(key)) {
        return true;
      }
      seen.add(key);
      return false;
    });
}

async function getAllPermissions() {
    logger.info("Pulling all permissions");
    return await Permissions.findOne();
}

const filterHighestPermission = (globalPerms, requestedPerms) => {
    const locationMap = new Map();
    requestedPerms.forEach(requestedParam => {
        const thisPerm = requestedParam.name;
        const thisLocation = requestedParam.location;
        const thisLevel = globalPerms.find(perm => perm.location === thisLocation)?.names
            .find(permName => permName.name === thisPerm)?.level;
        if (requestedParam.action === "add") {
            if (!locationMap.has(thisLocation) || thisLevel > locationMap.get(thisLocation).level) {
                locationMap.set(thisLocation, { level: thisLevel, name: thisPerm});
            }
        }
        else {
            if (!locationMap.has(thisLocation) || thisLevel < locationMap.get(thisLocation).level) {
                locationMap.set(thisLocation, { level: thisLevel, name: thisPerm});
            }
        }
    });

    const filteredObjects = requestedPerms.filter(reqPerm => {
        const location = reqPerm.location;
        return locationMap.has(location) && locationMap.get(location).name === reqPerm.name;
    });
    return filteredObjects;
};

const adjustArray = (globalPerms, requestedPerms) => {
    let adjustedArray = filterHighestPermission(globalPerms, requestedPerms);
    requestedPerms.forEach(action => {
        const { location, name, action: actionType } = action;
        const locationNames = globalPerms.find(p => p.location === location)?.names;
        if (!locationNames) {
            return;
        }

        const permObject = locationNames.find(p => p.name === name);
        if (!permObject) {
            return;
        }

        if (actionType === "remove") {
            locationNames.forEach(perm => {
                if (perm.level > permObject.level && !adjustedArray.some(p => p.name === perm.name && p.location === location)) {
                    adjustedArray.push({ name: perm.name, location, action: "remove" });
                }
            });
        } else if (actionType === "add") {
            locationNames.forEach(perm => {
                if (perm.level < permObject.level && !adjustedArray.some(p => p.name === perm.name && p.location === location)) {
                    adjustedArray.push({ name: perm.name, location, action: "add" });
                }
            });
        }
    });

    return adjustedArray;
};

async function editUserGroup(id, permissions) {
    logger.info(`Editing user group ${id}, adjusting with ${permissions.length} permissions`);
    const duplicatedPermissions = duplicatePermissions(permissions);
    if (duplicatedPermissions) {
        throw new Error("Duplicate Permissions Requested");
    }
    const allPermissions = await getAllPermissions();
    const adjustedArray = adjustArray(allPermissions.permissions, permissions);
    // Initialize bulk operations...
   // An elegant solution which is not very optimized since this is just one document.
   //
   // Overkill but the operations happen at once rather than multiple chained queries
   const bulkUpdate = UserGroup.collection.initializeUnorderedBulkOp();
   adjustedArray.forEach(mod => {
        if (mod.action === "add") {
            bulkUpdate.find({ _id: new mongoose.Types.ObjectId(id), canEdit: true }).updateOne({
            $addToSet: { permissions: { name: mod.name, location: mod.location } }
            });
        } else if (mod.action === "remove") {
            bulkUpdate.find({ _id: new mongoose.Types.ObjectId(id), canEdit: true }).updateOne({
            $pull: { permissions: { name: mod.name, location: mod.location } }
            });
        }
    });
    if (adjustedArray.length === 0) {
        throw new Error("Invalid permissions requested");
    }
    const response = await bulkUpdate.execute();
    if (response.modifiedCount === 0) {
        throw new Error("Unable to modify user group");
    }
    else {
        logger.info("User group adjusted");
    }
}

async function createUserGroup(groupName) {
    logger.info(`Creating a new user group: ${groupName}`);
    const userGroupExists = await doesUserGroupExist(groupName);
    if (!userGroupExists) {
        const newUserGroup = new UserGroup({
            name: groupName,
            canDelete: true,
            canEdit: true,
            permissions: []
        });
        await newUserGroup.save();
    }
    else {
        throw new Error("User group already exists");
    }
}

async function getNumUserGroups() {
    logger.info("Pulling num user groups");
    return await UserGroup.count();
}

async function getUserGroups() {
    logger.info("Pulling user groups");
    return await UserGroup.find();
}

module.exports = {
    checkForAPIKey,
    getUsers,
	getNumUsers,
    getUserPermissions,
    createUser,
    setUsersGroup,
    deleteUserGroup,
    getUsersInGroup,
    editUserGroup,
    createUserGroup,
    getAllPermissions,
    getNumUserGroups,
    getUserGroups
};
