"use strict";
const { createClient } = require("redis");
const fs = require("fs");
const logger = require("../logger");

let redisClient, redisSubscriber, sessionClient;
var systemSubscriptions = {};

const REDIS_KEYS = {
    WALKASINS_GLG_FW: { name: "walkasins_glgfw", duration: -1 }, //until cleared
    SYSTEM_METRIC_UP_FLAG: { name: "system_metric_up", duration: 3600 }, //1 hour
    PERMISSIONS: { name: "permissions", duration: 3600 }, // 1 hour
    SYSTEM_FILE_DL_URL: { name: "gwFileDownload", duration: 1209600 }, // 2 weeks
    SYSTEM_UPDATES: { name: "updates-" }, //pub-sub on system updates
    SYSTEM_SHELL_RESPONSES: { name: "shell-" }, //pub-sub on system shell responses
};

async function initializeRedisClient() {
    let pass = fs.readFileSync(process.env.REDIS_PASS, "utf-8").toString();
    pass = pass.replace(/\s+/g, "");
    redisClient = createClient({ url: "redis://rxfunction-gw-redis:6379", password: pass });
    sessionClient = createClient({ url: "redis://rxfunction-gw-redis:6379", password: pass });
    redisSubscriber = createClient({ url: "redis://rxfunction-gw-redis:6379", password: pass });

    const clients = [["pub_loc", redisClient], ["session", sessionClient], ["sub", redisSubscriber]];
    clients.forEach(([label, client]) => {
        client.on("error", (err) => logger.error(`Redis client ${label} Error`, err));
        client.on("ready", () => logger.info(`Redis client ${label} ready`));
        client.on("reconnecting", () => logger.info(`Redis client ${label} reconnecting...`));
    });

    for (const [label, client] of clients) {
        try {
            await client.connect();
        } catch (error) {
            logger.error(`REDIS SERVICE: Failed to connect Redis client ${label}: ${error}`);
        }
    }
}

async function closeRedisClients() {
    logger.info("REDIS SERVICE: Disconnecting all redis clients");
    const clients = [["pub_loc", redisClient], ["session", sessionClient], ["sub", redisSubscriber]];
    for (const [label, client] of clients) {
        try {
            await client.quit();
        } catch (error) {
            logger.error(`REDIS SERVICE: Failed to disconnect Redis client ${label}: ${error}`);
        }
    }
}

function getSessionClient() {
    return sessionClient;
}

async function releaseS3Lock() {
    await redisClient.del("s3_lock");
};

async function acquireS3Lock() {
    const lock = await redisClient.set("s3_lock", "locked", {
      EX: 10,
      NX: true
    });

    return lock === "OK";
};

async function releaseSQSLock() {
    await redisClient.del("sqs_lock");
};

async function acquireSQSLock() {
    const lock = await redisClient.set("sqs_lock", "locked", {
      EX: 10,
      NX: true
    });

    return lock === "OK";
};

async function subToSystem(type, system, client) {
    logger.info(`REDIS SERVICE: Client subbing to ${type.name}${system}`);
    try {
        if (!systemSubscriptions[`${type.name}${system}`]) {
            systemSubscriptions[`${type.name}${system}`] = [];
            await redisSubscriber.subscribe(`${type.name}${system}`, (message) => {
                try {
                    logger.debug(`REDIS SERVICE: Received message for system ${system}: ${message}`);
                    systemSubscriptions[`${type.name}${system}`].forEach(subClient => {
                        subClient.response.write(`data: ${message}\n\n`);
                    });
                }
                catch {
                    //drop exception on pub issues
                }
            });
        }
        systemSubscriptions[`${type.name}${system}`].push(client);
    }
    catch (error) {
        logger.error(`REDIS SERVICE: Failed to sub: ${error}`);
    }
}

async function unsubFromSystem(type, system, clientId) {
    logger.info(`REDIS SERVICE: Client ${clientId} unsubbing from: ${type.name}${system}`);
    try {
        if (systemSubscriptions[`${type.name}${system}`]) {
            const index = systemSubscriptions[`${type.name}${system}`].findIndex(client => client.id === clientId);
            if (index !== -1) {
                systemSubscriptions[`${type.name}${system}`].splice(index, 1);
            }
            const remainingSubs = systemSubscriptions[`${type.name}${system}`].length;
            if (remainingSubs === 0) {
                logger.debug(`REDIS SERVICE: No remaining subs of ${type.name}${system}, unsubscribing`);
                await redisSubscriber.unsubscribe(`${type.name}${system}`);
                delete systemSubscriptions[`${type.name}${system}`];
            }
            else {
                logger.debug(`REDIS SERVICE: Removed sub of ${type.name}${system}, remaining subs: ${remainingSubs}`);
            }
        }
    }
    catch (error) {
        logger.error(`REDIS SERVICE: Failed to unsub: ${error}`);
    }
}

async function pubToSystem(type, system, message) {
    logger.info(`REDIS SERVICE: Redis pub to: ${type.name}${system}, message: ${message}`);
    try {
        await redisClient.publish(`${type.name}${system}`, message);
    } catch (error) {
        logger.error(`REDIS SERVICE: Failed to publish to Redis: ${error}`);
    }
}

async function getKey(type, key) {
    logger.debug(`REDIS SERVICE: getting key: ${type.name}:${key}`);
    try {
        if (!("duration" in type)) {
            throw Error(`REDIS SERVICE: Cannot get pub/sub key:  ${type.name}:${key}`);
        }
        const cachedData = await redisClient.get(`${type.name}:${key}`);
        if (cachedData) {
            logger.debug(`REDIS SERVICE: got key: ${type.name}:${key}, data: ${JSON.stringify(cachedData)}`);
            return cachedData;
        } else {
            logger.debug(`REDIS SERVICE: key not found: ${type.name}:${key}`);
            return undefined;
        }
    } catch (error) {
        logger.error(`REDIS SERVICE: Failed to retrieve memory for key ${key}, ${error}`);
        return undefined;
    }
}

async function setKey(type, key, data) {
    try {
        if (!("duration" in type)) {
            throw Error(`REDIS SERVICE: Cannot set pub/sub key:  ${type.name}:${key}`);
        }
        logger.debug(`REDIS SERVICE: setting key: ${type.name}:${key}, dur: ${type.duration} with data: ${JSON.stringify(data)}`);
        if (type.duration !== -1) {
            await redisClient.set(`${type.name}:${key}`, data, {
                EX: type.duration
            });
        }
        else {
            await redisClient.set(`${type.name}:${key}`, data);
        }
    } catch (error) {
        logger.error(`REDIS SERVICE: Failed to save data to Redis. key: ${type.name}:${key}, err: ${error}`);
    }
}

async function clearKey(type, key) {
    logger.debug(`REDIS SERVICE: clearing key: ${type.name}:${key}`);
    try {
        if (!("duration" in type)) {
            throw Error(`REDIS SERVICE: Cannot clear pub/sub key:  ${type.name}:${key}`);
        }
        await redisClient.del(`${type.name}:${key}`);
    } catch (error) {
        logger.error(`REDIS SERVICE: Failed to clear data to Redis. key: ${type.name}:${key}, err: ${error}`);
    }
}

module.exports = {
    REDIS_KEYS,
    initializeRedisClient,
    closeRedisClients,
    acquireS3Lock,
    releaseS3Lock,
    acquireSQSLock,
    getSessionClient,
    releaseSQSLock,
    subToSystem,
    unsubFromSystem,
    pubToSystem,
    getKey,
    setKey,
    clearKey
};
