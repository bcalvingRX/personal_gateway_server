"use strict";
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const redisService = require("./redis.service.js");
const logger = require("../logger");
const EventEmitter = require("events");

let sqsClient;
let polling = false;
let pollingRate;
let pollingQuietTime;
const sqsPollingComplete = new EventEmitter();

const gatewayOperations = "gateway/send/cbor";
const shadowChanges = "shadow/update/documents";

async function initializeAWS(reqPollingQuietTime, reqPollingDuration) {
    pollingQuietTime = reqPollingQuietTime;
    pollingRate = reqPollingDuration;
    try {
        if (process.env.AWS_SQS_ACCESS_ID && process.env.AWS_SQS_ACCESS_KEY) {
            sqsClient = new SQSClient({
                credentials: {
                    accessKeyId: process.env.AWS_SQS_ACCESS_ID,
                    secretAccessKey: process.env.AWS_SQS_ACCESS_KEY,
                },
                region: process.env.AWS_REGION,
            });
        }
        else {
            sqsClient = new SQSClient({
                region: process.env.AWS_REGION,
            });
        }
        logger.info("AWS SQS ready");
    } catch (error) {
        logger.error(`Failed to connect to AWS MQTT: ${error}`);
    }
}

// Function to delete a message from the queue after processing
async function deleteMessage(receiptHandle) {
    const deleteParams = {
        QueueUrl: process.env.AWS_SQS_SUB_ENDPOINT,
        ReceiptHandle: receiptHandle
    };

    try {
        await sqsClient.send(new DeleteMessageCommand(deleteParams));
    } catch (error) {
        logger.error(`Error deleting message: ${error}`);
    }
};

async function mqttResponseHandler(topic, payload) {
    try {
        const parts = topic.split("/");
        let gateway;
        let data;
        let type;
        if (topic.endsWith(shadowChanges) && parts.length > 2 && payload?.message?.current?.state) {
            gateway = parts[2];
            data = payload.message.current?.state;
            type = redisService.REDIS_KEYS.GATEWAY_UPDATES;
        }
        if (gateway && data) {
            logger.info(`MQTT message ${type} from gateway ${gateway} publishing: ${data}`);
            await redisService.pubToGateway(type, gateway, JSON.stringify(data));
        }
        else {
            throw Error(`Topic not supported: ${topic}`);
        }
    } catch (error) {
        logger.error(`Failed to parse MQTT message: ${error}`);
    }
}

async function processMessage(msg, callback) {
    try {
        const msgJSON = JSON.parse(msg.Body);
        if (msgJSON.payload && msgJSON.payload.topic ) {
            if (msgJSON.payload.topic.endsWith(gatewayOperations)) {
                await callback(msgJSON.payload);
            } else {
                await mqttResponseHandler(msgJSON.payload.topic, msgJSON.payload);
            }
        }
    } catch (error) {
        logger.error(`${error}`);
    }
    await deleteMessage(msg.ReceiptHandle);
}

async function receiveSQSMessages(callback) {
    const params = {
      QueueUrl: process.env.AWS_SQS_SUB_ENDPOINT,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: pollingRate,
      VisibilityTimeout: 30
    };

    try {
        const sqsResp = await sqsClient.send(new ReceiveMessageCommand(params));
        if (sqsResp && sqsResp.Messages) {
            await sqsResp.Messages.forEach(async (msg) => {
                if (msg) {
                    logger.info(`Received queue message ${msg.Body}`);
                    await processMessage(msg, callback);
                }
            });
        }
    } catch (error) {
        logger.error(`Error receiving messages: ${error}`);
    }
};

async function pollMessages(callback) {
    if (await redisService.acquireSQSLock()) {
      await receiveSQSMessages(callback);
      await redisService.releaseSQSLock();
    }
    //Lock may not be acquired, fine to skip this round
    //another replica has the lock
};

// Function to continuously poll an SQS queue for messages
async function startSQSReceiver(callback) {
    async function scheduleNextPoll() {
        try {
            await pollMessages(callback);
        } catch (error) {
            logger.error(`Error during SQS message polling: ${error}`);
        }
        //little breathing room between long polls,
        //perhaps make this configurable if it turns out to matter later
        if (polling) {
            setTimeout(scheduleNextPoll, pollingQuietTime);
        }
        else {
            sqsPollingComplete.emit("signal", "SQS polling stopped");
            return;
        }
    }
    polling = true;
    scheduleNextPoll();
};

// Function to continuously poll an SQS queue for messages
async function stopSQSReceiver() {
    logger.info("Stopping SQS polling...");
    polling = false;
    const signalData = await new Promise((resolve) => {
        sqsPollingComplete.once("signal", resolve);
    });
    logger.info(signalData);
}

module.exports = {
    initializeAWS,
    startSQSReceiver,
    stopSQSReceiver
};
