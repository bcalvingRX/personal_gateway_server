"use strict";
const logger = require("./logger");
const https = require("https");
const fs = require("fs");
const env = require("dotenv");
const database = require("./services/database.service.js");
const awsSQS = require("./services/aws.sqs.service.js");
const redis = require("./services/redis.service.js");
const awsIOT = require("./services/aws.iot.service.js");
const awsAthena = require("./services/aws.athena.service.js");
const managerApp = require("./apps/manager-app.js");
const apiApp = require("./apps/api-app.js");

async function startManagerApp(key, cert, devMode) {
    const server = https.createServer({
        key: key,
        cert: cert
    }, await managerApp.getApp(devMode));

    server.listen(managerApp.port, () => {
        logger.info(`app listening on port ${managerApp.port}`);
    });
}

async function startAPIApp(key, cert, devMode) {
    const apiServer = https.createServer({
        key: key,
        cert: cert
    }, await apiApp.getApp(devMode));

    apiServer.listen(apiApp.port, () => {
        logger.info(`api app listening on port ${apiApp.port}`);
    });
}

function checkEnv() {
    let devMode;

    //required server env variables
    let requiredEnv = [
        "SESSION_STORE_SECRET",
        "REDIS_PASS",
        "KEY_FILE",
        "CERT_FILE",
        "GW_FILES_BUCKET",
        "MONGO_ENDPOINT",
        "AWS_REGION",
        "AWS_SQS_SUB_ENDPOINT",
        "AWS_SQS_PUB_ENDPOINT",
        "GRG_ENDPOINT",
        "GRG_GET_REVISIONS",
        "GRG_DOWNLOAD_REVISION",
        "GRG_TOKEN",
        "GRG_FW_DOC_UUID",
        "GITHUB_ENDPOINT",
        "GITHUB_GET_RELEASES",
        "GITHUB_DOWNLOAD_REVISION",
        "GITHUB_TOKEN"
    ];

    let unsetEnv = requiredEnv.filter((reqEnv) => !(typeof process.env[reqEnv] !== "undefined"));
    if (unsetEnv.length > 0) {
        env.config({ path: "/run/gw-secrets/server_config" });
        logger.info("Prod");
        devMode = false;
        //must be docker, load from secrets
        unsetEnv = requiredEnv.filter((reqEnv) => !(typeof process.env[reqEnv] !== "undefined"));
    }
    else {
        logger.info("Dev");
        devMode = true;
    }

    // Shutdown if we are emissing env variables
    if (unsetEnv.length > 0) {
        logger.error(`Required ENV variables are not set: [${unsetEnv.join(", ")}]`);
        throw new Error(`Required ENV variables are not set: [${unsetEnv.join(", ")}]`);
    }
    return devMode;
}

async function initializeServices() {
    //load default .env
    env.config();

    //configure environment
    const devMode = checkEnv();

    //retrieve credentials
    let key = fs.readFileSync(process.env.KEY_FILE);
    let cert = fs.readFileSync(process.env.CERT_FILE);

    //Set up various services
    await database.connectToDatabase();
    awsSQS.initializeAWS(1000, process.env.AWS_SQS_POLL_SPEED);
    await redis.initializeRedisClient();
    const mqttRouter = require("./routes/mqtt.route");
    awsSQS.startSQSReceiver(async function (payload) {
        await mqttRouter.process(payload);
    });
    awsIOT.initializeAWS();
    awsAthena.initializeAWS();

    //start applications
    await startManagerApp(key, cert, devMode);
    await startAPIApp(key, cert, devMode);
}

// Initialize services and start the app
initializeServices().catch(error => {
    logger.error(`Error initializing services: ${error}`);
    throw new Error(`Error initializing services: ${error}`);
});
