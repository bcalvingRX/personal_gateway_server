const request = require("supertest");
const managerApp = require("../apps/manager-app.js");
const Readable = require("stream").Readable;
const { sdkStreamMixin } = require("@smithy/util-stream");
const { IoTDataPlaneClient, GetThingShadowCommand, UpdateThingShadowCommand } = require("@aws-sdk/client-iot-data-plane");
const { AthenaClient, StartQueryExecutionCommand, ListNamedQueriesCommand, GetNamedQueryCommand, GetQueryExecutionCommand } = require( "@aws-sdk/client-athena");
const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const { mockClient } = require("aws-sdk-client-mock");
const ioTDataPlaneClient = mockClient(IoTDataPlaneClient);
const sQSClient = mockClient(SQSClient);
const athenaClient = mockClient(AthenaClient);
const s3Client = mockClient(S3Client);
const axios = require("axios");
const AdmZip = require("adm-zip");
const zip = new AdmZip();
jest.mock("axios");

beforeEach(() => {
  ioTDataPlaneClient.reset();
  sQSClient.reset();
  athenaClient.reset();
});

describe("Getting Firmware", () => {
  test("Should require index parameter", async () => {
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/firmware");
    expect(res.statusCode).not.toBe(200);

    res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 0 });
    expect(res.statusCode).toBe(200);
  });
  
  test("Should return 10 firmware results at a time", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
  })

  test("Should allow optional filtering of firmware ID", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 0, firmwareID: 'HM_DEV_2.3.0_2.3.0' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    res.body.forEach(firmware => {
      expect(firmware).toHaveProperty("firmware_id")
      expect(firmware["firmware_id"]).toContain('HM_DEV_2.3.0_2.3.0')
    })
    res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 0, firmwareID: 'GW_Alpha_1.4.0_2.6.1_90.25.0' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    res.body.forEach(firmware => {
      expect(firmware).toHaveProperty("firmware_id")
      expect(firmware["firmware_id"]).toContain('GW_Alpha_1.4.0_2.6.1_90.25.0')
    })
  })

  test("Should allow optional population of fleet data", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 0, populateFleets: true })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    res.body.forEach(firmware => {
      expect(firmware).toHaveProperty("fleets")
    })
  })

  test("Should paginate results based on provided index", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const firstSet = res.body
    res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 5 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const secondSet = res.body

    // Convert entries to JSON strings
    const firstSetJson = firstSet.map(entry => JSON.stringify(entry));
    const secondSetJson = secondSet.map(entry => JSON.stringify(entry));

    // Check that the last five entries of firstSet are the same as the first five entries of secondSet
    expect(firstSetJson.slice(-5)).toEqual(secondSetJson.slice(0, 5));

    // Check that the last five entries of secondSet are different from any entries in firstSet
    const firstSetEntries = new Set(firstSetJson);
    secondSetJson.slice(-5).forEach(entry => {
        expect(firstSetEntries.has(entry)).toBe(false);
    });

    // Check that the first five entries of firstSet are different from any entries in secondSet
    const secondSetEntries = new Set(secondSetJson);
    firstSetJson.slice(0, 5).forEach(entry => {
        expect(secondSetEntries.has(entry)).toBe(false);
    });
  })
  
  test("Should contain fields firmware_id, firmware_desc, and source", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    const firmware = res.body[0]
    const mandatoryFields = [
      "firmware_id",
      "firmware_desc",
      "source"
    ]
    mandatoryFields.forEach(field => {
      expect(firmware).toHaveProperty(field)
    })
  })

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getFirmware').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/firmware")
      .query({ index: 0 })
    expect(res.statusCode).not.toBe(200);
    systemService.getFirmware.mockRestore();
  });
});

describe("Getting Number of Firmware images", () => {
  test("Should return the number of firmwares", async () => {
    const app = await managerApp.getApp(true)
    let gettingAllFirmware = true
    let index = 0
    let expectedNumOfFirmware = 0
    while(gettingAllFirmware) {
      const getFirmwareResp = await request(app)
        .get("/api/fw/firmware")
        .query({ index: index })
      index += 10
      expectedNumOfFirmware += getFirmwareResp.body.length
      gettingAllFirmware = getFirmwareResp.body.length === 10
    }
    const res = await request(app)
      .get("/api/fw/firmwareCount")
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toEqual(expectedNumOfFirmware)
  })

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getNumberFirmware').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/firmwareCount")
    expect(res.statusCode).not.toBe(200);
    systemService.getNumberFirmware.mockRestore();
  });
})

describe("Saving Firmware", () => {
  test("If GH, should require a source, firmwareID, description, org, repo, tag, and file", async () => {
    const app = await managerApp.getApp(true);
    const DeviceFirmwareSchema = require("../model/w200/firmware-template.js");
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});
    axios.get.mockResolvedValue({ data: [
        {
          tag_name: "v1.0.0",
          assets: [
            {
              id: 12345,
              name: "test.bin"
            }
          ]
        }
      ]
    });
    let res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw1',
        description: 'Test firmware',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'invalidsource',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
        tag: 'v1.0.0',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
        tag: 'v1.0.0',
      });
    expect(res.statusCode).toBe(200);
  });

  test("If GLG, should require a source, revisionID and file", async () => {
    const app = await managerApp.getApp(true);
    const DeviceFirmwareSchema = require("../model/w200/firmware-template.js");
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});
    axios.get.mockResolvedValue({
      data: Buffer.from("mock file data"),
      headers: {
        "content-disposition": 'attachment; filename="test.bin"'
      }
    });
    let res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
        firmwareID: 'fw1',
        description: 'Test firmware',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        revisionID: '6235234523'
      });
    expect(res.statusCode).toBe(200);

    //clear for another case
    axios.get.mockClear();
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});

    // Alternative: Mock zip file scenario
    zip.addFile("test.bin", Buffer.from("mock firmware content"));

    axios.get.mockResolvedValue({
      data: zip.toBuffer(),
      headers: {
        "content-disposition": 'attachment; filename="archive.zip"'
      }
    });
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        revisionID: '6235234523'
      });
    expect(res.statusCode).toBe(200);
  });

  test("Should confirm the firmware is accessable through the external API", async () => {
    const app = await managerApp.getApp(true);
    const DeviceFirmwareSchema = require("../model/w200/firmware-template.js");
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});
    axios.get.mockResolvedValue({
      data: Buffer.from("mock file data"),
      headers: {
        "content-disposition": 'attachment; filename="notthefile.bin"'
      }
    });
    let res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        revisionID: '6235234523'
      });
    expect(res.statusCode).not.toBe(200);

    //clear for another case
    axios.get.mockClear();
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});

    // Alternative: Mock zip file scenario
    axios.get.mockResolvedValue({ data: [
        {
          tag_name: "v1.0.0",
          assets: [
            {
              id: 12345,
              name: "notthefile.bin"
            }
          ]
        }
      ]
    });
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
        tag: 'v1.0.0',
      });
    expect(res.statusCode).not.toBe(200);
  });

  test("Should reject duplicate firmware IDs", async () => {
    const app = await managerApp.getApp(true);
    const DeviceFirmwareSchema = require("../model/w200/firmware-template.js");
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});
    axios.get.mockResolvedValue({ data: [
        {
          tag_name: "v1.0.0",
          assets: [
            {
              id: 12345,
              name: "test.bin"
            }
          ]
        }
      ]
    });
    let res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
        tag: 'v1.0.0',
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
        tag: 'v1.0.0',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        revisionID: '6235234523'
      });
    expect(res.statusCode).not.toBe(200);
  });

  test("Should prevent saving the same source", async () => {
    const app = await managerApp.getApp(true);
    const DeviceFirmwareSchema = require("../model/w200/firmware-template.js");
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});
    axios.get.mockResolvedValue({ data: [
        {
          tag_name: "v1.0.0",
          assets: [
            {
              id: 12345,
              name: "test.bin"
            }
          ]
        }
      ]
    });
    let res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
        tag: 'v1.0.0',
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw2',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
        tag: 'v1.0.0',
      });
    expect(res.statusCode).not.toBe(200);

    //clear for another case
    axios.get.mockClear();
    await DeviceFirmwareSchema.deleteMany({firmware_id: 'fw1'});

    // Alternative: Mock zip file scenario
    zip.addFile("test.bin", Buffer.from("mock firmware content"));

    axios.get.mockResolvedValue({
      data: zip.toBuffer(),
      headers: {
        "content-disposition": 'attachment; filename="archive.zip"'
      }
    });
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        revisionID: '6235234523'
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'glg',
        firmwareID: 'fw2',
        description: 'Test firmware',
        file: 'test.bin',
        revisionID: '6235234523'
      });
    expect(res.statusCode).not.toBe(200);
  });

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getFirmware').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .post("/api/fw/firmware")
      .send({
        source: 'gh',
        firmwareID: 'fw1',
        description: 'Test firmware',
        file: 'test.bin',
        org: 'testorg',
        repo: 'testrepo',
        tag: 'v1.0.0',
      });
    expect(res.statusCode).not.toBe(200);
    systemService.getFirmware.mockRestore();
  });
});

describe("Getting Groups", () => {
  test("Should require index parameter", async () => {
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/groups");
    expect(res.statusCode).not.toBe(200);

    res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 0 });
    expect(res.statusCode).toBe(200);
  });
  
  test("Should return 10 groups results at a time", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
  })

  test("Should allow optional filtering of group ID", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 0, groupID: '000000000007' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    res.body.forEach(firmware => {
      expect(firmware).toHaveProperty("group_id")
      expect(firmware["group_id"]).toContain('000000000007')
    })
    res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 0, groupID: '000000000008' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    res.body.forEach(firmware => {
      expect(firmware).toHaveProperty("group_id")
      expect(firmware["group_id"]).toContain('000000000008')
    })
  })

  test("Should allow optional population of fleet data", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 0, populateFleets: true })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    res.body.forEach(group => {
      expect(group).toHaveProperty("fleets")
    })
  })

  test("Should paginate results based on provided index", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const firstSet = res.body
    res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 5 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const secondSet = res.body

    // Convert entries to JSON strings
    const firstSetJson = firstSet.map(entry => JSON.stringify(entry));
    const secondSetJson = secondSet.map(entry => JSON.stringify(entry));

    // Check that the last five entries of firstSet are the same as the first five entries of secondSet
    expect(firstSetJson.slice(-5)).toEqual(secondSetJson.slice(0, 5));

    // Check that the last five entries of secondSet are different from any entries in firstSet
    const firstSetEntries = new Set(firstSetJson);
    secondSetJson.slice(-5).forEach(entry => {
        expect(firstSetEntries.has(entry)).toBe(false);
    });

    // Check that the first five entries of firstSet are different from any entries in secondSet
    const secondSetEntries = new Set(secondSetJson);
    firstSetJson.slice(0, 5).forEach(entry => {
        expect(secondSetEntries.has(entry)).toBe(false);
    });
  })
  
  test("Should contain fields firmware_id, firmware_desc, and source", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    const group = res.body[0]
    const mandatoryFields = [
      "group_id",
      "group_desc"
    ]
    mandatoryFields.forEach(field => {
      expect(group).toHaveProperty(field)
    })
  })

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getGroups').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/groups")
      .query({ index: 0 })
    expect(res.statusCode).not.toBe(200);
    systemService.getGroups.mockRestore();
  });
});

describe("Getting Number of Groups", () => {
  test("Should return the number of groups", async () => {
    const app = await managerApp.getApp(true)
    let gettingAllGroups = true
    let index = 0
    let expectedNumOfGroups = 0
    while(gettingAllGroups) {
      const getGroupResp = await request(app)
        .get("/api/fw/groups")
        .query({ index: index })
      index += 10
      expectedNumOfGroups += getGroupResp.body.length
      gettingAllGroups = getGroupResp.body.length === 10
    }
    const res = await request(app)
      .get("/api/fw/groupCount")
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toEqual(expectedNumOfGroups)
  })

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getNumberGroups').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/groupCount")
    expect(res.statusCode).not.toBe(200);
    systemService.getNumberGroups.mockRestore();
  });
})

describe("Saving Groups", () => {
  test("Should require a groupID and description", async () => {
    const app = await managerApp.getApp(true);
    const GroupSchema = require("../model/w200/group-template");
    await GroupSchema.deleteMany({group_id: '0005145123'});
    let res = await request(app)
      .post("/api/fw/group")
      .send({
        groupID: '0005145123',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/group")
      .send({
        description: 'Test group',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/group")
      .send({
        groupID: '0005145123',
        description: 'Test group',
      });
    expect(res.statusCode).toBe(200);
  });

  test("Should reject duplicate group IDs", async () => {
    const app = await managerApp.getApp(true);
    const GroupSchema = require("../model/w200/group-template");
    await GroupSchema.deleteMany({group_id: '0005145123'});
    let res = await request(app)
      .post("/api/fw/group")
      .send({
        groupID: '0005145123',
        description: 'Test group',
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/group")
      .send({
        groupID: '0005145123',
        description: 'Test group',
      });
    expect(res.statusCode).not.toBe(200);
  });

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getDeviceGroup').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .post("/api/fw/group")
      .send({
        groupID: '0005145123',
        description: 'Test group',
      });
    expect(res.statusCode).not.toBe(200);
    systemService.getDeviceGroup.mockRestore();
  });
});

describe("Getting Fleets", () => {
  test("Should require index parameter", async () => {
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/fleets");
    expect(res.statusCode).not.toBe(200);

    res = await request(app)
      .get("/api/fw/fleets")
      .query({ index: 0 });
    expect(res.statusCode).toBe(200);
  });
  
  test("Should return 10 fleets results at a time", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/fleets")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
  })

  test("Should paginate results based on provided index", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/fleets")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const firstSet = res.body
    res = await request(app)
      .get("/api/fw/fleets")
      .query({ index: 5 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const secondSet = res.body

    // Convert entries to JSON strings
    const firstSetJson = firstSet.map(entry => JSON.stringify(entry));
    const secondSetJson = secondSet.map(entry => JSON.stringify(entry));

    // Check that the last five entries of firstSet are the same as the first five entries of secondSet
    expect(firstSetJson.slice(-5)).toEqual(secondSetJson.slice(0, 5));

    // Check that the last five entries of secondSet are different from any entries in firstSet
    const firstSetEntries = new Set(firstSetJson);
    secondSetJson.slice(-5).forEach(entry => {
        expect(firstSetEntries.has(entry)).toBe(false);
    });

    // Check that the first five entries of firstSet are different from any entries in secondSet
    const secondSetEntries = new Set(secondSetJson);
    firstSetJson.slice(0, 5).forEach(entry => {
        expect(secondSetEntries.has(entry)).toBe(false);
    });
  })
  
  test("Should contain fields fleet_description, fleet_name, and device_groups as well as group/firmware sub fields", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/fleets")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    const fleets = res.body
    const mandatoryFields = [
      "fleet_description",
      "fleet_name",
      "device_groups"
    ]
    const groupingFields = [
      "group",
      "firmware"
    ]
    const deviceGroupFields = [
      "group_id",
      "group_desc"
    ]
    const firmwareFields = [
      "firmware_id",
      "firmware_desc",
      "source"
    ]
    fleets.forEach(fleet => {
      mandatoryFields.forEach(field => {
        expect(fleet).toHaveProperty(field)
        if(field == "device_groups") {
          fleet["device_groups"].forEach(grouping => {
            groupingFields.forEach(groupingField => {
              expect(grouping).toHaveProperty(groupingField)
              if(groupingField == "group") {
                deviceGroupFields.forEach(groupField => {
                  expect(grouping["group"]).toHaveProperty(groupField)
                })
              }
              if(groupingField == "firmware") {
                firmwareFields.forEach(firmwareField => {
                  expect(grouping["firmware"]).toHaveProperty(firmwareField)
                })
              }
            })
          })
        }
      })
    })
  })

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getFleets').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/fleets")
      .query({ index: 0 })
    expect(res.statusCode).not.toBe(200);
    systemService.getFleets.mockRestore();
  });
});

describe("Getting Number of Fleets", () => {
  test("Should return the number of fleets", async () => {
    const app = await managerApp.getApp(true)
    let gettingAllFleets = true
    let index = 0
    let expectedNumOfFleets = 0
    while(gettingAllFleets) {
      const getFleetResp = await request(app)
        .get("/api/fw/fleets")
        .query({ index: index })
      index += 10
      expectedNumOfFleets += getFleetResp.body.length
      gettingAllFleets = getFleetResp.body.length === 10
    }
    const res = await request(app)
      .get("/api/fw/fleetCount")
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toEqual(expectedNumOfFleets)
  })

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getNumFleets').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/fleetCount")
    expect(res.statusCode).not.toBe(200);
    systemService.getNumFleets.mockRestore();
  });
})


describe("Getting Fleet details", () => {
  test("Should require a provided fleetID field", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/fleetDetails")
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .get("/api/fw/fleetDetails")
      .query({ fleetID: 'ProdFleet1' })
    expect(res.statusCode).toBe(200);
  })

  test("Should return fields fleet_description, fleet_name, and device_groups as well as group/firmware sub fields of the requested fleet", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/fw/fleetDetails")
      .query({ fleetID: 'ProdFleet1' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    const fleet = res.body
    const mandatoryFields = [
      "fleet_description",
      "fleet_name",
      "device_groups"
    ]
    const groupingFields = [
      "group",
      "firmware"
    ]
    const deviceGroupFields = [
      "group_id",
      "group_desc"
    ]
    const firmwareFields = [
      "firmware_id",
      "firmware_desc",
      "source"
    ]
    mandatoryFields.forEach(field => {
      expect(fleet).toHaveProperty(field)
      if(field == "device_groups") {
        fleet["device_groups"].forEach(grouping => {
          groupingFields.forEach(groupingField => {
            expect(grouping).toHaveProperty(groupingField)
            if(groupingField == "group") {
              deviceGroupFields.forEach(groupField => {
                expect(grouping["group"]).toHaveProperty(groupField)
              })
            }
            if(groupingField == "firmware") {
              firmwareFields.forEach(firmwareField => {
                expect(grouping["firmware"]).toHaveProperty(firmwareField)
              })
            }
          })
        })
      }
    })
  })

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getFleet').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/fw/fleetDetails")
      .query({ fleetID: 'ProdFleet1' })
    expect(res.statusCode).not.toBe(200);
    systemService.getFleet.mockRestore();
  });
})

describe("Saving Fleets", () => {
  test("Should require a fleetID and description", async () => {
    const app = await managerApp.getApp(true);
    const FleetSchema = require("../model/w200/fleet-template");
    await FleetSchema.deleteMany({fleet_name: '95080123123'});
    let res = await request(app)
      .post("/api/fw/fleet")
      .send({
        fleetID: '95080123123',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/fleet")
      .send({
        description: 'Test fleet',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/fleet")
      .send({
        fleetID: '95080123123',
        description: 'Test fleet',
      });
    expect(res.statusCode).toBe(200);
  });

  test("Should reject duplicate fleet IDs", async () => {
     const app = await managerApp.getApp(true);
    const FleetSchema = require("../model/w200/fleet-template");
    await FleetSchema.deleteMany({fleet_name: '95080123123'});
    let res = await request(app)
      .post("/api/fw/fleet")
      .send({
        fleetID: '95080123123',
        description: 'Test fleet',
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/fleet")
      .send({
        fleetID: '95080123123',
        description: 'Test fleet',
      });
    expect(res.statusCode).not.toBe(200);
  });

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getFleet').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .post("/api/fw/fleet")
      .send({
        fleetID: '95080123123',
        description: 'Test fleet',
      });
    expect(res.statusCode).not.toBe(200);
    systemService.getFleet.mockRestore();
  });
});

describe("Modifying Fleets", () => {
  test("Should require a fleetID and a non-empty modifications array of group_id and firmware_id string properties", async () => {
    const app = await managerApp.getApp(true);
    const FleetSchema = require("../model/w200/fleet-template");
    await FleetSchema.deleteMany({fleet_name: '95080123123'});
    let res = await request(app)
    .post("/api/fw/fleet")
    .send({
      fleetID: '95080123123',
      description: 'Test fleet',
    });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        modifications: [ { firmware_id: "HM_DEV_2.3.0_2.3.0" }],
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
        modifications: [ ],
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
        modifications: [ { group_id: "000000000008" }],
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
        modifications: [ { firmware_id: 15123, group_id: true }],
      });
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
        modifications: [ { firmware_id: "HM_DEV_2.3.0_2.3.0", group_id: "000000000008" }],
      });
    expect(res.statusCode).toBe(200);
  });

  test("Should allow modifying the firmware target of an existing group", async () => {
    const app = await managerApp.getApp(true);
    const FleetSchema = require("../model/w200/fleet-template");
    await FleetSchema.deleteMany({fleet_name: '95080123123'});
    let res = await request(app)
    .post("/api/fw/fleet")
    .send({
      fleetID: '95080123123',
      description: 'Test fleet',
    });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
        modifications: [ { firmware_id: "HM_DEV_2.3.0_2.3.0", group_id: "000000000008" }],
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .get("/api/fw/fleetDetails")
      .query({ fleetID: '95080123123' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    let fleet = res.body
    expect(fleet["device_groups"][0]["group"]["group_id"]).toEqual("000000000008")
    expect(fleet["device_groups"][0]["firmware"]["firmware_id"]).toEqual("HM_DEV_2.3.0_2.3.0")
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
        modifications: [ { firmware_id: "RS_Prod_1.2.1_2.4.2", group_id: "000000000008" }],
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .get("/api/fw/fleetDetails")
      .query({ fleetID: '95080123123' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    fleet = res.body
    expect(fleet["device_groups"][0]["group"]["group_id"]).toEqual("000000000008")
    expect(fleet["device_groups"][0]["firmware"]["firmware_id"]).toEqual("RS_Prod_1.2.1_2.4.2")
  });

  test("Should set the dirty bit of all assigned systems when modified", async () => {
    const app = await managerApp.getApp(true);
    const FleetSchema = require("../model/w200/fleet-template");
    await FleetSchema.deleteMany({fleet_name: '95080123123'});
    await FleetSchema.deleteMany({fleet_name: '95080123124'});
    let res = await request(app)
      .post("/api/fw/fleet")
      .send({
        fleetID: '95080123123',
        description: 'Test fleet1',
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
        modifications: [ { firmware_id: "HM_DEV_2.3.0_2.3.0", group_id: "000000000008" }],
      });
    res = await request(app)
      .post("/api/fw/fleet")
      .send({
        fleetID: '95080123124',
        description: 'Test fleet2',
      });
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123124',
        modifications: [ { firmware_id: "RS_Prod_1.2.1_2.4.2", group_id: "000000000001" }],
      });
    expect(res.statusCode).toBe(200);
    const SystemSchema = require("../model/w200/systems-template");
    const fleetOne = await FleetSchema.findOne({fleet_name: '95080123123'});
    const fleetTwo = await FleetSchema.findOne({fleet_name: '95080123124'});
    await SystemSchema.deleteMany({ system_name: "testsystem1" })
    await SystemSchema.deleteMany({ system_name: "testsystem2" })
    await SystemSchema.deleteMany({ system_name: "testsystem3" })
    await SystemSchema.create({
        system_name: "testsystem1",
        fleet: fleetOne._id,
        active: true,
        dirty_flag: false
      }
    );
    await SystemSchema.create({
        system_name: "testsystem2",
        fleet: fleetOne._id,
        active: true,
        dirty_flag: false
      }
    );
    await SystemSchema.create({
        system_name: "testsystem3",
        fleet: fleetTwo._id,
        active: true,
        dirty_flag: false
      }
    );

    //modify
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123123',
        modifications: [ { firmware_id: "RS_Prod_1.2.1_2.4.2", group_id: "000000000008" }],
      });
    expect(res.statusCode).toBe(200);
    let systemOne = await SystemSchema.findOne({system_name: 'testsystem1'});
    let systemTwo = await SystemSchema.findOne({system_name: 'testsystem2'});
    let systemThree = await SystemSchema.findOne({system_name: 'testsystem3'});
    expect(systemOne["dirty_flag"]).toEqual(true);
    expect(systemTwo["dirty_flag"]).toEqual(true);
    expect(systemThree["dirty_flag"]).toEqual(false);

    //add
    res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123124',
        modifications: [ { firmware_id: "RS_Prod_1.2.1_2.4.2", group_id: "000000000008" }],
      });
    expect(res.statusCode).toBe(200);
    systemOne = await SystemSchema.findOne({system_name: 'testsystem1'});
    systemTwo = await SystemSchema.findOne({system_name: 'testsystem2'});
    systemThree = await SystemSchema.findOne({system_name: 'testsystem3'});
    expect(systemOne["dirty_flag"]).toEqual(true);
    expect(systemTwo["dirty_flag"]).toEqual(true);
    expect(systemThree["dirty_flag"]).toEqual(true);
    
    await FleetSchema.deleteMany({fleet_name: '95080123123'});
    await FleetSchema.deleteMany({fleet_name: '95080123124'});
    await SystemSchema.deleteMany({ system_name: "testsystem1" })
    await SystemSchema.deleteMany({ system_name: "testsystem2" })
    await SystemSchema.deleteMany({ system_name: "testsystem3" })
  });

  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'modifyFleetEntry').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .post("/api/fw/modify")
      .send({
        fleetID: '95080123124',
        modifications: [ { firmware_id: "RS_Prod_1.2.1_2.4.2", group_id: "000000000008" }],
      });
    expect(res.statusCode).not.toBe(200);
    systemService.modifyFleetEntry.mockRestore();
  });
});