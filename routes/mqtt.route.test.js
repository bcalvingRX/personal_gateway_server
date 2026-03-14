const request = require("supertest");
const managerApp = require("../apps/manager-app.js");
const { mockClient } = require("aws-sdk-client-mock");
const redisService = require("../services/redis.service");
const Readable = require("stream").Readable;
const { sdkStreamMixin } = require("@smithy/util-stream");
const { GetObjectCommand, HeadObjectCommand, CopyObjectCommand, PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const { AthenaClient, StartQueryExecutionCommand, ListNamedQueriesCommand, GetNamedQueryCommand, GetQueryExecutionCommand } = require( "@aws-sdk/client-athena");
const { IoTDataPlaneClient, GetThingShadowCommand, UpdateThingShadowCommand, PublishCommand } = require("@aws-sdk/client-iot-data-plane");
jest.mock("axios");
const sQSClient = mockClient(SQSClient);
const athenaClient = mockClient(AthenaClient);
const s3Client = mockClient(S3Client);
const ioTDataPlaneClient = mockClient(IoTDataPlaneClient);
const axios = require("axios");
const AdmZip = require("adm-zip");
const { nil } = require("ajv");
const zip = new AdmZip();

beforeEach(() => {
  ioTDataPlaneClient.reset();
  sQSClient.reset();
  athenaClient.reset();
  s3Client.reset();
});
describe("Reporting System Metrics", () => {
  test("Should require a command, gateway, and record parameter", async () => {
    const SystemMetrics = require("../model/w200/system-metrics-template.js");
    const startingMetric = await SystemMetrics.findOne({system_name:'W2-000000006'});
    const requiredThingID = "unknown_thing_id"
    await redisService.clearKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, requiredThingID)
    const record = {
        imsi: "15124124151",
        iccid: "151551412341",
        imei: "6234623452345",
        fw: "66251234124"
    }
    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })

    //missing gateway
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                command:"info",
                record: record
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let endingMetric = await SystemMetrics.findOne({system_name:'W2-000000006'});
    if(startingMetric) {
      expect(startingMetric.lastUpdatedTimestamp).toEqual(endingMetric.lastUpdatedTimestamp)
    }
    await redisService.clearKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, requiredThingID)
    sQSClient.resetHistory()
    const receiptHandle2 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle2 }],
    })

    //missing command
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                record: record
            }
          }),
          ReceiptHandle: receiptHandle2,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    endingMetric = await SystemMetrics.findOne({system_name:'W2-000000006'});
    if(startingMetric) {
      expect(startingMetric.lastUpdatedTimestamp).toEqual(endingMetric.lastUpdatedTimestamp)
    }

    await redisService.clearKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, requiredThingID)
    sQSClient.resetHistory()
    const receiptHandle3 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle3 }],
    })

    //missing record
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"info",
            }
          }),
          ReceiptHandle: receiptHandle3,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    endingMetric = await SystemMetrics.findOne({system_name:'W2-000000006'});
    if(startingMetric) {
      expect(startingMetric.lastUpdatedTimestamp).toEqual(endingMetric.lastUpdatedTimestamp)
    }

    await redisService.clearKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, requiredThingID)
    sQSClient.resetHistory()
    const receiptHandle4 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle4 }],
    })

    //nothing missing
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"info",
                record: record
            }
          }),
          ReceiptHandle: receiptHandle4,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    endingMetric = await SystemMetrics.findOne({system_name:'W2-000000006'});
    if(startingMetric) {
      expect(startingMetric.lastUpdatedTimestamp).toEqual(endingMetric.lastUpdatedTimestamp)
    }
  })

  test("Should ensure the thing_id is enrolled in a system", async () => {
    const SystemMetrics = require("../model/w200/system-metrics-template.js");
    const startingNumMetrics = await SystemMetrics.countDocuments();
    const requiredThingID = "unknown_thing_id"
    await redisService.clearKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, requiredThingID)
    const record = {
        imsi: "15124124151",
        iccid: "151551412341",
        imei: "6234623452345",
        fw: "66251234124"
    }
    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"info",
                record: record
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const endingNumMetrics = await SystemMetrics.countDocuments();
    expect(startingNumMetrics).toEqual(endingNumMetrics)
  })

  test("Should allow generic metric structures to be saved for a system", async () => {
    const app = await managerApp.getApp(true)
    const requiredThingID = "test_tls12"
    await redisService.clearKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, requiredThingID)
    const firstRecord = {
        imsi: "15124124151",
        iccid: "151551412341",
        imei: "6234623452345",
        fw: "66251234124"
    }
    const secondRecord = {
        randomField1: "testing",
        randomField2: 1251234123,
        randomField3: true,
        randomField4: {
            subElement1: 1,
            subElement2: "123",
            subElement3: false,
        }
    }
    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"info",
                record: firstRecord
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let res = await request(app)
      .get("/api/system/metrics")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    let metrics = res.body
    for (const key of Object.keys(firstRecord)) {
        expect(metrics).toHaveProperty(key);
        expect(metrics[key]).toEqual(firstRecord[key]);
    }
    await redisService.clearKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, requiredThingID)
    sQSClient.resetHistory()
    const receiptHandle2 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle2 }],
    })
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"info",
                record: secondRecord
            }
          }),
          ReceiptHandle: receiptHandle2,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    res = await request(app)
      .get("/api/system/metrics")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    metrics = res.body
    //check root level items
    for (const key of Object.keys(secondRecord)) {
        expect(metrics).toHaveProperty(key);
        expect(metrics[key]).toEqual(secondRecord[key]);
    }
    //now check nested structure
    for (const key of Object.keys(secondRecord["randomField4"])) {
        expect(metrics["randomField4"]).toHaveProperty(key);
        expect(metrics["randomField4"][key]).toEqual(secondRecord["randomField4"][key]);
    }
  })

  test("Should prevent rapid updates from the same thing id", async () => {
    const app = await managerApp.getApp(true)
    const requiredThingID = "test_tls12"
    await redisService.clearKey(redisService.REDIS_KEYS.SYSTEM_METRIC_UP_FLAG, requiredThingID)
    const firstRecord = {
        imsi: "15124124151",
        iccid: "151551412341",
        imei: "6234623452345",
        fw: "66251234124"
    }
    const secondRecord = {
        randomField1: "testing",
        randomField2: 1251234123,
        randomField3: true,
        randomField4: {
            subElement1: 1,
            subElement2: "123",
            subElement3: false,
        }
    }
    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"info",
                record: firstRecord
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let res = await request(app)
      .get("/api/system/metrics")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    let metrics = res.body
    for (const key of Object.keys(firstRecord)) {
        expect(metrics).toHaveProperty(key);
        expect(metrics[key]).toEqual(firstRecord[key]);
    }
    sQSClient.resetHistory()
    const receiptHandle2 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle2 }],
    })
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"info",
                record: secondRecord
            }
          }),
          ReceiptHandle: receiptHandle2,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    res = await request(app)
      .get("/api/system/metrics")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    metrics = res.body
    //second record thrown, still on first record
    for (const key of Object.keys(firstRecord)) {
        expect(metrics).toHaveProperty(key);
        expect(metrics[key]).toEqual(firstRecord[key]);
    }
  })
})


describe("MQTT Requests", () => {
  test("Should verify the command sent is valid", async () => {
    s3Client.resetHistory()
    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                command:"unknown_command"
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(0)
    sQSClient.resetHistory()
  })

  test("Should handle exceptions gracefully", async () => {
    jest.doMock("../middleware/mqtt-input.middleware.js", () => ({
      ...jest.requireActual("../middleware/mqtt-input.middleware.js"),
      getCommand: jest.fn().mockRejectedValue(new Error('Parsing error encountered'))
    }));
    s3Client.resetHistory()
    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                command:"unknown_command"
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(0)
    sQSClient.resetHistory()
  })
})

describe("Firmware File Requests", () => {
  test("Should require a file, type, and offset parameter", async () => {
    const requiredThingID = "test_tls12"
    s3Client.resetHistory()
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); //two weeks, 1 week more than our expiry
    s3Client.on(HeadObjectCommand).resolves({
      Expiration: `expiry-date="${futureDate.toISOString()}"`,
      ContentLength: 1024,
      LastModified: new Date(),
      ETag: '"abc123"'
    })

    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })

    //missing gateway
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                command:"data",
                file: "fake_file",
                type: "fw",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(0)
    sQSClient.resetHistory()
    const receiptHandle2 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle2 }],
    })

    //missing command
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                file: "fake_file",
                type: "fw",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle2,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(0)
    sQSClient.resetHistory()
    const receiptHandle3 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle3 }],
    })

    //incorrect type
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"data",
                file: "fake_file",
                type: "unknown_type",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle3,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(0)
    sQSClient.resetHistory()
    const receiptHandle4 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle4 }],
    })

    //nothing missing
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"data",
                file: "fake_file",
                type: "rand",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle4,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(ioTDataPlaneClient.commandCalls(PublishCommand).length < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(1)
    expect(responses[0].args[0].input.topic).toContain(requiredThingID)
    const payload = JSON.parse(new TextDecoder("utf-8").decode(responses[0].args[0].input.payload))
    expect(payload).toHaveProperty("command")
    expect(payload["command"]).toEqual("data")
    expect(payload).toHaveProperty("message")
    expect(payload["message"]).toMatch(/^https:/)
  })

  test("Should only upload data to S3 when the data is near expiry", async () => {
    const requiredThingID = "test_tls12"
    s3Client.resetHistory()
    // Set expiry to 5 days from now (less than 1 week threshold, triggers reupload)
    const nearExpiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    s3Client.on(HeadObjectCommand).resolvesOnce({
      Expiration: `expiry-date="${nearExpiryDate.toISOString()}"`,
      ContentLength: 1024,
      LastModified: new Date(),
      ETag: '"abc123"'
    })
    s3Client.on(CopyObjectCommand).resolvesOnce({})

    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })

    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"data",
                file: "fake_file",
                type: "rand",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(ioTDataPlaneClient.commandCalls(PublishCommand).length < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify the response was sent
    const responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(1)
    expect(responses[0].args[0].input.topic).toContain(requiredThingID)
    const payload = JSON.parse(new TextDecoder("utf-8").decode(responses[0].args[0].input.payload))
    expect(payload).toHaveProperty("command")
    expect(payload["command"]).toEqual("data")
    expect(payload).toHaveProperty("message")
    expect(payload["message"]).toMatch(/^https:/)
    
    const copyCommands = s3Client.commandCalls(CopyObjectCommand)
    expect(copyCommands.length).toBe(1)
    expect(copyCommands[0].args[0].input.Bucket).toBeDefined()
    expect(copyCommands[0].args[0].input.Key).toEqual("randfake_file")
    expect(copyCommands[0].args[0].input.CopySource).toContain("fake_file")
  })

  test("Should transfer the file data to S3 if its not in S3", async () => {
    const requiredThingID = "test_tls12"
    s3Client.resetHistory()
    s3Client.on(HeadObjectCommand).rejectsOnce(new Error("NoSuchKey"))
    s3Client.on(PutObjectCommand).resolvesOnce({})

    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })

    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"data",
                file: "fake_file",
                type: "rand",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(ioTDataPlaneClient.commandCalls(PublishCommand).length < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const headCommands = s3Client.commandCalls(HeadObjectCommand)
    expect(headCommands.length).toBe(1)
    expect(headCommands[0].args[0].input.Key).toEqual("randfake_file")
    const putCommands = s3Client.commandCalls(PutObjectCommand)
    expect(putCommands.length).toBe(1)
    expect(putCommands[0].args[0].input.Key).toEqual("randfake_file")
    expect(putCommands[0].args[0].input.Bucket).toBeDefined()
    expect(putCommands[0].args[0].input.Body).toBeDefined()

    // Verify the response was sent
    const responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(1)
    expect(responses[0].args[0].input.topic).toContain(requiredThingID)
    const payload = JSON.parse(new TextDecoder("utf-8").decode(responses[0].args[0].input.payload))
    expect(payload).toHaveProperty("command")
    expect(payload["command"]).toEqual("data")
    expect(payload).toHaveProperty("message")
    expect(payload["message"]).toMatch(/^https:/)
  })

  test("Should support downloading FW files from GLG", async () => {
    const requiredThingID = "test_tls12"
    
    const DeviceFirmwareSchema = require("../model/w200/firmware-template.js");
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});
    await DeviceFirmwareSchema.create({
      firmware_id: 'fw1',
      firmware_desc: 'Test firmware',
      source: 'glg',
      file: 'glg_test_file.bin',
      revision: '6235234523'
    })
    zip.addFile("glg_test_file.bin", Buffer.from("mock firmware content"));
    axios.get.mockResolvedValue({
      data: zip.toBuffer(),
      headers: {
        "content-disposition": 'attachment; filename="archive.zip"'
      }
    });
    s3Client.resetHistory()
    s3Client.on(HeadObjectCommand).rejectsOnce(new Error("NoSuchKey"))
    s3Client.on(PutObjectCommand).resolvesOnce({})

    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })

    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"data",
                file: "fw1",
                type: "fw",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(ioTDataPlaneClient.commandCalls(PublishCommand).length < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const headCommands = s3Client.commandCalls(HeadObjectCommand)
    expect(headCommands.length).toBe(1)
    expect(headCommands[0].args[0].input.Key).toEqual("fwfw1")
    const putCommands = s3Client.commandCalls(PutObjectCommand)
    expect(putCommands.length).toBe(1)
    expect(putCommands[0].args[0].input.Key).toEqual("fwfw1")
    expect(putCommands[0].args[0].input.Bucket).toBeDefined()
    expect(putCommands[0].args[0].input.Body).toBeDefined()

    // Verify the response was sent
    const responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(1)
    expect(responses[0].args[0].input.topic).toContain(requiredThingID)
    const payload = JSON.parse(new TextDecoder("utf-8").decode(responses[0].args[0].input.payload))
    expect(payload).toHaveProperty("command")
    expect(payload["command"]).toEqual("data")
    expect(payload).toHaveProperty("message")
    expect(payload["message"]).toMatch(/^https:/)
  })

  test("Should support downloading FW files from Github", async () => {
    const requiredThingID = "test_tls12"
    const DeviceFirmwareSchema = require("../model/w200/firmware-template.js");
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});
    await DeviceFirmwareSchema.create({
      firmware_id: 'fw1',
      firmware_desc: 'Test firmware',
      source: 'gh',
      file: 'gh_test_file.bin',
      org: 'testorg',
      repo: 'testrepo',
      tag: "v1.0.0"
    })
    axios.get.mockResolvedValueOnce({
      data: Buffer.from("mock firmware binary data"),
      headers: {
        "content-type": "application/octet-stream"
      }
    });
    s3Client.resetHistory()
    s3Client.on(HeadObjectCommand).rejectsOnce(new Error("NoSuchKey"))
    s3Client.on(PutObjectCommand).resolvesOnce({})

    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })

    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"data",
                file: "fw1",
                type: "fw",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(ioTDataPlaneClient.commandCalls(PublishCommand).length < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const headCommands = s3Client.commandCalls(HeadObjectCommand)
    expect(headCommands.length).toBe(1)
    expect(headCommands[0].args[0].input.Key).toEqual("fwfw1")
    const putCommands = s3Client.commandCalls(PutObjectCommand)
    expect(putCommands.length).toBe(1)
    expect(putCommands[0].args[0].input.Key).toEqual("fwfw1")
    expect(putCommands[0].args[0].input.Bucket).toBeDefined()
    expect(putCommands[0].args[0].input.Body).toBeDefined()

    // Verify the response was sent
    const responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(1)
    expect(responses[0].args[0].input.topic).toContain(requiredThingID)
    const payload = JSON.parse(new TextDecoder("utf-8").decode(responses[0].args[0].input.payload))
    expect(payload).toHaveProperty("command")
    expect(payload["command"]).toEqual("data")
    expect(payload).toHaveProperty("message")
    expect(payload["message"]).toMatch(/^https:/)
  })

  test("Should support downloading FW manifest files", async () => {
    const requiredThingID = "test_tls12"
    const StateRecordSchema = require("../model/w200/state-record-template.js");
    await StateRecordSchema.deleteMany({state_hash: '3226014637', state_type: "fleetgroups"});
    await StateRecordSchema.create({
      state_hash: '3226014637',
      state_type: "fleetgroups",
      hash_content: [
        [
          "000000000001|GW_Prod_1.0.0_2.2.1_89.32.0",
          "000000000002|HM_DEV_2.0.0_2.0.1",
          "000000000003|CM_Prod_1.0.0_2.2.1",
          "000000000004|GW_Prod_1.0.0_2.2.1_89.32.0",
          "000000000005|RS_Prod_1.0.0_2.2.1"
        ]
      ],
    })
    s3Client.resetHistory()
    s3Client.on(HeadObjectCommand).rejectsOnce(new Error("NoSuchKey"))
    s3Client.on(PutObjectCommand).resolvesOnce({})

    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })

    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"data",
                file: "3226014637",
                type: "fw_man",
                offset: "0"
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(ioTDataPlaneClient.commandCalls(PublishCommand).length < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const headCommands = s3Client.commandCalls(HeadObjectCommand)
    expect(headCommands.length).toBe(1)
    expect(headCommands[0].args[0].input.Key).toEqual("fw_man3226014637")
    const putCommands = s3Client.commandCalls(PutObjectCommand)
    expect(putCommands.length).toBe(1)
    expect(putCommands[0].args[0].input.Key).toEqual("fw_man3226014637")
    expect(putCommands[0].args[0].input.Bucket).toBeDefined()
    expect(putCommands[0].args[0].input.Body).toBeDefined()

    // Verify the response was sent
    const responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(1)
    expect(responses[0].args[0].input.topic).toContain(requiredThingID)
    const payload = JSON.parse(new TextDecoder("utf-8").decode(responses[0].args[0].input.payload))
    expect(payload).toHaveProperty("command")
    expect(payload["command"]).toEqual("data")
    expect(payload).toHaveProperty("message")
    expect(payload["message"]).toMatch(/^https:/)
  })
})


describe("The IoT data shell stream", () => {
  test("Should require a message property", async () => {
    const requiredThingID = "test_tls12"
    s3Client.resetHistory()

    sQSClient.resetHistory()
    const receiptHandle1 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle1 }],
    })

    //missing gateway
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                command:"shell",
                message: "a shell message",
            }
          }),
          ReceiptHandle: receiptHandle1,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(0)
    sQSClient.resetHistory()
    const receiptHandle2 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle2 }],
    })

    //missing message
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"shell"
            }
          }),
          ReceiptHandle: receiptHandle2,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(sQSClient.commandCalls(ReceiveMessageCommand).length <= 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    responses = ioTDataPlaneClient.commandCalls(PublishCommand)
    expect(responses.length).toBe(0)
    sQSClient.resetHistory()
    const receiptHandle3 = `handle_${Date.now()}`
    sQSClient.on(DeleteMessageCommand).resolvesOnce({
      Successful: [{ Id: receiptHandle3 }],
    })

    //nothing missing
    let receivedMessage = null;
    const mockClient = {
      id: Date.now(),
      response: {
        write: (data) => {
          // Extract the message from SSE format: "data: {message}\n\n"
          const message = data.replace('data: ', '').replace('\n\n', '');
          receivedMessage = JSON.parse(message);
        }
      }
    };
    const unsubscribe = await redisService.subToSystem(
      redisService.REDIS_KEYS.SYSTEM_SHELL_RESPONSES,
      requiredThingID,
      mockClient
    );
    ioTDataPlaneClient.reset()
    sQSClient.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [ {
          Body: JSON.stringify({
            payload: {
                topic: "gateway/send/cbor",
                gateway: requiredThingID,
                command:"shell",
                message: "a shell message",
            }
          }),
          ReceiptHandle: receiptHandle3,
          MessageAttributes: {
            "X-Custom-Attr": {
              DataType: "String",
              StringValue: "value",
            },
          },
        }
      ]
    })
    while(receivedMessage === null) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    expect(receivedMessage).toHaveProperty("message");
    expect(receivedMessage.message).toEqual("a shell message");

    if (unsubscribe) {
      await unsubscribe();
    }
  }, 20000)
})