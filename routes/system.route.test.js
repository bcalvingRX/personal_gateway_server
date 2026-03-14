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

beforeEach(() => {
  ioTDataPlaneClient.reset();
  sQSClient.reset();
  athenaClient.reset();
});

describe("Getting Systems", () => {
  test("Should require a provided index", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/")
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .get("/api/system/")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
  })

  test("Should return 10 systems at a time", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
  })

  test("Should allow optional filtering of system ID", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/")
      .query({ index: 0, systemID: 'W2-000000006' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    res.body.forEach(system => {
      expect(system).toHaveProperty("system_name")
      expect(system["system_name"]).toContain('W2-000000006')
    })
    res = await request(app)
      .get("/api/system/")
      .query({ index: 0, systemID: 'W2-00000002' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    res.body.forEach(system => {
      expect(system).toHaveProperty("system_name")
      expect(system["system_name"]).toContain('W2-00000002')
    })
  })

  test("Should allow optional filtering of fleet ID", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/")
      .query({ index: 0, fleetID: 'ProdFleet1' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    res.body.forEach(system => {
      expect(system).toHaveProperty("fleet")
      expect(system["fleet"]).toHaveProperty("fleet_name")
      expect(system["fleet"]["fleet_name"]).toContain('ProdFleet1')
    })
  })

  test("Should paginate results based on provided index", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
     .get("/api/system/")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const firstSet = res.body
    res = await request(app)
      .get("/api/system/")
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

  test("Should contain fields system_name, fleet, active, and dirty_flag", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBeGreaterThan(0)
    const system = res.body[0]
    const mandatoryFields = [
      "system_name",
      "fleet",
      "active",
      "dirty_flag"
    ]
    mandatoryFields.forEach(field => {
      expect(system).toHaveProperty(field)
    })
  })
  
  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getSystems').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/system/")
      .query({ index: 0 })
    expect(res.statusCode).not.toBe(200);
    systemService.getSystems.mockRestore();
  });
})

describe("Getting Number of Systems", () => {
  test("Should return the number of systems", async () => {
    const app = await managerApp.getApp(true)
    let gettingAllSystems = true
    let index = 0
    let expectedNumOfSystems = 0
    while(gettingAllSystems) {
      const getSystemsResp = await request(app)
        .get("/api/system/")
        .query({ index: index })
      index += 10
      expectedNumOfSystems += getSystemsResp.body.length
      gettingAllSystems = getSystemsResp.body.length === 10
    }
    const res = await request(app)
      .get("/api/system/amount")
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toEqual(expectedNumOfSystems)
  })
  
  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getNumSystems').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/system/amount")
    expect(res.statusCode).not.toBe(200);
    systemService.getNumSystems.mockRestore();
  });
})

describe("Getting System details", () => {
  test("Should require a provided systemID field", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/details")
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .get("/api/system/details")
      .query({ systemID: 'unknown_system' })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .get("/api/system/details")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).toBe(200);
  })

  test("Should return the system_name, fleet, active, dirty_flag, shadow details, and details of every enrolled device of the requested session", async () => {
    const app = await managerApp.getApp(true)
    const expectedShadowFH = "15132512"
    const expectedShadowDH = "651234123"
    const requiredThingID = "test_tls12"
    const mockShadow = { state: { 
      desired: { FH: expectedShadowFH, DH: expectedShadowDH },
      reported: { FH: expectedShadowFH, DH: expectedShadowDH },
    }};
    const mockShadowPayload = { payload: new TextEncoder().encode(JSON.stringify( mockShadow ))}
    ioTDataPlaneClient.on(GetThingShadowCommand, { thingName: requiredThingID }).resolves(mockShadowPayload)

    let res = await request(app)
      .get("/api/system/details")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).toBe(200);
    const system = res.body
    const mandatoryFields = [
      "system_name",
      "fleet",
      "active",
      "dirty_flag",
      "devices",
      "shadow",
    ]
    const mandatoryChildDeviceFields = [
      "device_id",
      "system",
      "update_group",
      "active",
      "last_reported_online",
      "current_firmware",
      "type"
    ]
    mandatoryFields.forEach(field => {
      expect(system).toHaveProperty(field)
      if(field == "devices") {
        expect(system["devices"].length).toBeGreaterThan(0)
        system["devices"].forEach(device => {
          mandatoryChildDeviceFields.forEach(deviceField => {
            expect(device).toHaveProperty(deviceField)
          })
        })
      }
      else if(field == "shadow") {
        expect(JSON.stringify(system["shadow"]["shadow"])).toEqual(JSON.stringify(mockShadow))
      }
    })
  })
  
  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getSystem').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/system/details")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).not.toBe(200);
    systemService.getSystem.mockRestore();
  });
})


describe("Getting System Metrics", () => {
  test("Should require a systemID parameter", async () => {
    const SystemMetrics = require("../model/w200/system-metrics-template.js");
    await SystemMetrics.deleteMany({system_name:'testsystem1'});
    await SystemMetrics.create({
      system_name: 'testsystem1',
      lastUpdatedTimestamp: 0,
      customfield1: "test",
      customfield2: 1
    });
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/system/metrics")
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .get("/api/system/metrics")
      .query({ systemID: 'testsystem1' })
    expect(res.statusCode).toBe(200);
  })

  test("Should return system metric fields", async () => {
    const SystemMetrics = require("../model/w200/system-metrics-template.js");
    await SystemMetrics.deleteMany({system_name:'testsystem1'});
    await SystemMetrics.create({
      system_name: 'testsystem1',
      lastUpdatedTimestamp: 0,
      customfield1: "test",
      customfield2: 1
    });
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/system/metrics")
      .query({ systemID: 'testsystem1' })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toHaveProperty("system_name")
    expect(res.body["system_name"]).toEqual('testsystem1')
    expect(res.body).toHaveProperty("lastUpdatedTimestamp")
    expect(res.body["lastUpdatedTimestamp"]).toEqual(0)
    expect(res.body).toHaveProperty("customfield1")
    expect(res.body["customfield1"]).toEqual('test')
    expect(res.body).toHaveProperty("customfield2")
    expect(res.body["customfield2"]).toEqual(1)
  })

  test("Should handle exceptions gracefully", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getSystemMetrics').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/system/metrics")
      .query({ systemID: 'testsystem1' })
    expect(res.statusCode).not.toBe(200);
    systemService.getSystemMetrics.mockRestore();
  })
})

describe("Changing a System's Fleet Assignment", () => {
  test("Should require provided systemID and FleetID fields", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .post("/api/system/setFleet")
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/system/setFleet")
      .send({ systemID: 'W2-000000006' })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/system/setFleet")
      .send({ fleetID: 'ProdFleet1' })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/system/setFleet")
      .send({ systemID: 'W2-000000006', fleetID: 'ProdFleet1' })
    expect(res.statusCode).toBe(200);
  })
  test("Should ensure the systemID and FleetID fields are valid", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .post("/api/system/setFleet")
      .send({ systemID: 'W2-000000006', fleetID: 'FakeFleet' })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/system/setFleet")
      .send({ systemID: 'W2-XXXXXXX', fleetID: 'ProdFleet1' })
    expect(res.statusCode).not.toBe(200);
  })
  test("Should change the requested system's fleet to the provided fleet", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .post("/api/system/setFleet")
      .send({ systemID: 'W2-000000006', fleetID: 'ProdFleet1' })
    expect(res.statusCode).toBe(200);
    let getSystem = await request(app)
      .get("/api/system/details")
      .query({ systemID: 'W2-000000006'  })
    expect(getSystem.statusCode).toBe(200);
    expect(getSystem.body.fleet.fleet_name).toBe('ProdFleet1')
    res = await request(app)
      .post("/api/system/setFleet")
      .send({ systemID: 'W2-000000006', fleetID: 'DevFleet1' })
    expect(res.statusCode).toBe(200);
    getSystem = await request(app)
      .get("/api/system/details")
      .query({ systemID: 'W2-000000006'  })
    expect(getSystem.statusCode).toBe(200);
    expect(getSystem.body.fleet.fleet_name).toBe('DevFleet1')
  })
  
  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getSystem').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .post("/api/system/setFleet")
      .send({ systemID: 'W2-000000006', fleetID: 'DevFleet1' })
    expect(res.statusCode).not.toBe(200);
    systemService.getSystem.mockRestore();
  });
})

describe("Getting Device details", () => {
  test("Should require a provided deviceID field", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/device_details")
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .get("/api/system/device_details")
      .query({ deviceID: '20222000000000001' })
    expect(res.statusCode).toBe(200);
  })

  test("Should return the device_id, system, update_group, active, last_reported_online, current_firmware, and type of the requested device", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/device_details")
      .query({ deviceID: '20222000000000001' })
    expect(res.statusCode).toBe(200);
    const system = res.body
    const mandatoryFields = [
      "device_id",
      "system",
      "update_group",
      "active",
      "last_reported_online",
      "current_firmware",
      "type"
    ]
    const mandatorySystemFields = [
      "system_name",
      "fleet",
      "active",
      "dirty_flag"
    ]
    const mandatoryUpdateGroupFields = [
      "group_id",
      "group_desc"
    ]
    mandatoryFields.forEach(field => {
      expect(system).toHaveProperty(field)
      if(field == "system") {
        mandatorySystemFields.forEach(systemField => {
          expect(system["system"]).toHaveProperty(systemField)
        })
      }
      else if(field == "update_group") {
        mandatoryUpdateGroupFields.forEach(groupField => {
          expect(system["update_group"]).toHaveProperty(groupField)
        })
      }
    })
  })
  
  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'getDevice').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/system/device_details")
      .query({ deviceID: '20222000000000001' })
    expect(res.statusCode).not.toBe(200);
    systemService.getDevice.mockRestore();
  });
})

//TODO lets consider what sort of system modifications we will support from the UI
xdescribe("Modifying the devices of a system", () => {
  test("Should require provided systemID, additions, and removals fields", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/system/modify")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .get("/api/system/device_details")
      .query({ systemID: '20222000000000001' })
    expect(res.statusCode).toBe(200);
  })
  
  test("Should handle exceptions gracefully.", async () => {
    const systemService = require('../services/system.service');
    jest.spyOn(systemService, 'addDeviceToSystem').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/system/modify")
      .query({ systemID: 'W2-000000006' })
    expect(res.statusCode).not.toBe(200);
    systemService.addDeviceToSystem.mockRestore();
  });
})