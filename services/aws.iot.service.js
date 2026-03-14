"use strict";
const { IoTDataPlaneClient, GetThingShadowCommand, UpdateThingShadowCommand, PublishCommand } = require("@aws-sdk/client-iot-data-plane");
const logger = require("../logger");

const gatewayTopic = "server/send/json/{thingName}";

var iotDataPlaneClient;
async function initializeAWS() {

    try {
        if (process.env.AWS_IOT_ACCESS_ID && process.env.AWS_IOT_ACCESS_KEY) {
            iotDataPlaneClient = new IoTDataPlaneClient({
                credentials: {
                    accessKeyId: process.env.AWS_IOT_ACCESS_ID,
                    secretAccessKey: process.env.AWS_IOT_ACCESS_KEY,
                },
                region: process.env.AWS_REGION,
            });
        }
        else {
            iotDataPlaneClient = new IoTDataPlaneClient({
                region: process.env.AWS_REGION,
            });
        }
        logger.info("AWS IOT ready");

    } catch (error) {
        logger.info(`Failed to set up AWS Iot data plane: ${error}`);
    }
}

async function getIotShadow(thingName) {
    const input = {
        thingName: thingName
      };
    const command = new GetThingShadowCommand(input);
    return await iotDataPlaneClient.send(command);
}

async function getShadowsForADevice(gatewayID) {
    return getIotShadow(gatewayID).then(shadow => {
        const payload = JSON.parse(new TextDecoder("utf-8").decode(shadow.payload));
        return { thingName: gatewayID, shadow: payload };
    }).catch(error => {
        logger.error(`Error getting device shadow: ${error}`);
    });
}

async function updateShadowPropertyForDevice(gatewayID, properties, values) {
    const desiredState = {
        state: {
          desired: {}
        }
    };

    properties.map((property, index) => {
        desiredState.state.desired[property] = values[index];
    });
    const jsonStr = JSON.stringify(desiredState);
    logger.info(`Updating shadow with: ${jsonStr}`);
    const input = {
        thingName: gatewayID,
        payload: Buffer.from(jsonStr)
      };
    const command = new UpdateThingShadowCommand(input);
    return iotDataPlaneClient.send(command);
}

async function publishMessageToDevice(device, serviceLevel, message, retain) {
    const topic = gatewayTopic.replace("{thingName}", device);
    const input = {
        topic: topic,
        payload: Buffer.from(JSON.stringify(message)),
        qos: serviceLevel,
        retain: retain
      };
    const command = new PublishCommand(input);
    return await iotDataPlaneClient.send(command);
}

module.exports = {
    initializeAWS,
    updateShadowPropertyForDevice,
    publishMessageToDevice,
    getShadowsForADevice
};
