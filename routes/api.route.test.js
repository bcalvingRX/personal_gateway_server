const request = require("supertest");
const apiApp = require("../apps/api-app.js");
const Readable = require("stream").Readable;
const appVersion = require("../package.json").version;
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

describe("Provisioning new systems", () => {
   test("Should require fleetID and a devices array of objects containing a device_id, group_id, type, and at least one thing_id", async () => {
      const app = await apiApp.getApp(true);
      const DeviceSchema = require("../model/w200/device-template.js");
      await DeviceSchema.deleteMany({device_id: '8091709091'});
      await DeviceSchema.deleteMany({device_id: '8091709092'});
      let res = await request(app)
        .post("/api/provisionSystem")
        .send({ fleetID: 'ProdFleet1' })
      expect(res.statusCode).not.toBe(200);
      res = await request(app)
        .post("/api/provisionSystem")
        .set("Authorization", "123")
        .send({ 
          fleetID: 'ProdFleet1',
          devices: [{
              device_id: '8091709091'
            },
            {
              device_id: '8091709092'
            }
          ]
        })
      expect(res.statusCode).not.toBe(200);
      res = await request(app)
        .post("/api/provisionSystem")
        .send({ 
          fleetID: 'ProdFleet1',
          devices: [{
              device_id: '8091709091',
              type: "Gateway"
            },
            {
              device_id: '8091709092'
            }
          ]
        })
      expect(res.statusCode).not.toBe(200);
      res = await request(app)
        .post("/api/provisionSystem")
        .send({ 
          fleetID: 'ProdFleet1',
          devices: [{
              device_id: '8091709091',
              type: "Gateway"
            },
            {
              device_id: '8091709092',
              type: "Receptor Sole"
            }
          ]
        })
      res = await request(app)
        .post("/api/provisionSystem")
        .send({ 
          fleetID: 'ProdFleet1',
          devices: [{
              device_id: '8091709091',
              type: "Gateway",
              group_id: "000000000008"
            },
            {
              device_id: '8091709092',
              type: "Receptor Sole",
              group_id: "UnknownGroup"
            }
          ]
        })
      expect(res.statusCode).not.toBe(200);
      res = await request(app)
        .post("/api/provisionSystem")
        .send({ 
          fleetID: 'UnknownFleet',
          devices: [{
              device_id: '8091709091',
              type: "Gateway"
            },
            {
              device_id: '8091709092',
              type: "Receptor Sole"
            }
          ]
        })
      expect(res.statusCode).not.toBe(200);
      res = await request(app)
        .post("/api/provisionSystem")
        .send({ 
          fleetID: 'ProdFleet1',
          devices: [{
              device_id: '8091709091',
              type: "Gateway",
              group_id: "000000000008"
            },
            {
              device_id: '8091709092',
              type: "Receptor Sole",
              group_id: "000000000009"
            }
          ]
        })
      expect(res.statusCode).not.toBe(200);
      res = await request(app)
        .post("/api/provisionSystem")
        .send({ 
          fleetID: 'ProdFleet1',
          devices: [{
              device_id: '8091709091',
              type: "Gateway",
              group_id: "000000000008",
              thing_id: "thing1"
            },
            {
              device_id: '20222000000000001',
              type: "Receptor Sole",
              group_id: "000000000009"
            }
          ]
        })
      expect(res.statusCode).not.toBe(200);
      res = await request(app)
        .post("/api/provisionSystem")
        .send({ 
          fleetID: 'ProdFleet1',
          devices: [{
              device_id: '8091709091',
              type: "Gateway",
              group_id: "000000000008",
              thing_id: "thing1"
            },
            {
              device_id: '8091709092',
              type: "Receptor Sole",
              group_id: "000000000009"
            }
          ]
        })
      expect(res.statusCode).toBe(200);
    });
})

describe("Processing dirty systems", () => {
  test("Should update the shadows of all systems with dirty bits", async () => {
    const app = await apiApp.getApp(true);
    const GroupSchema = require("../model/w200/group-template");
    await GroupSchema.deleteMany({group_id: 'testgroup1'});
    await GroupSchema.deleteMany({group_id: 'testgroup2'});
    await GroupSchema.deleteMany({group_id: 'testgroup3'});
    const groupOne = await GroupSchema.create({
      group_id: 'testgroup1',
      group_desc: "test group 1"
    });
    const groupTwo = await GroupSchema.create({
      group_id: 'testgroup2',
      group_desc: "test group 2"
    });
    const groupThree = await GroupSchema.create({
      group_id: 'testgroup3',
      group_desc: "test group 3"
    });
    const FirmwareSchema = require("../model/w200/firmware-template");
    const firmwareOne = await FirmwareSchema.findOne({ firmware_id: "GW_DEV_1.5.0_2.7.0_91.01.0" })
    const firmwareTwo = await FirmwareSchema.findOne({ firmware_id: "RS_Prod_1.2.1_2.4.2" })
    const FleetSchema = require("../model/w200/fleet-template");
    await FleetSchema.deleteMany({fleet_name: 'testfleet1'});
    await FleetSchema.deleteMany({fleet_name: 'testfleet2'});
    const fleetOne = await FleetSchema.create({
      fleet_name: 'testfleet1',
      fleet_description: 'test fleet 1',
      device_groups: [
        { firmware: firmwareOne._id, group: groupOne._id },
        { firmware: firmwareTwo._id, group: groupTwo._id }
      ]
    });
    const fleetTwo = await FleetSchema.create({
      fleet_name: 'testfleet2',
      fleet_description: 'test fleet 2',
      device_groups: [
        { firmware: firmwareOne._id, group: groupThree._id }
      ]
    });
    const SystemSchema = require("../model/w200/systems-template");
    await SystemSchema.deleteMany({ system_name: "testsystem1" })
    await SystemSchema.deleteMany({ system_name: "testsystem2" })
    await SystemSchema.deleteMany({ system_name: "testsystem3" })

    //clear out existing dirty systems
    res = await request(app)
      .get("/api/processDirtySystems")
    expect(res.statusCode).toBe(200);

    const system1 = await SystemSchema.create({
        system_name: "testsystem1",
        fleet: fleetOne._id,
        active: true,
        dirty_flag: true
      }
    );
    const system2 = await SystemSchema.create({
        system_name: "testsystem2",
        fleet: fleetTwo._id,
        active: true,
        dirty_flag: true
      }
    );
    const system3 = await SystemSchema.create({
        system_name: "testsystem3",
        fleet: fleetTwo._id,
        active: true,
        dirty_flag: false
      }
    );
    const DeviceSchema = require("../model/w200/device-template.js");
    
    await DeviceSchema.deleteMany({ device_id: "testdevice1" })
    await DeviceSchema.deleteMany({ device_id: "testdevice2" })
    await DeviceSchema.deleteMany({ device_id: "testdevice3" })
    await DeviceSchema.deleteMany({ device_id: "testdevice4" })
    await DeviceSchema.deleteMany({ device_id: "testdevice5" })
    const expectedShadows = ["deviceShadow1", "deviceShadow2"]
    await DeviceSchema.create({
        device_id: "testdevice1",
        system: system1._id,
        update_group: groupOne._id,
        active: true,
        last_reported_online: 1,
        thing_id: expectedShadows[0],
        current_firmware: "NA",
        type: "Gateway"
      }
    );
    await DeviceSchema.create({
        device_id: "testdevice2",
        system: system1._id,
        update_group: groupOne._id,
        active: true,
        last_reported_online: 1,
        current_firmware: "NA",
        type: "Receptor Sole"
      }
    );
    await DeviceSchema.create({
        device_id: "testdevice3",
        system: system2._id,
        update_group: groupOne._id,
        active: true,
        last_reported_online: 1,
        thing_id: expectedShadows[1],
        current_firmware: "NA",
        type: "Gateway"
      }
    );
    await DeviceSchema.create({
        device_id: "testdevice4",
        system: system2._id,
        update_group: groupTwo._id,
        active: true,
        last_reported_online: 1,
        current_firmware: "NA",
        type: "Receptor Sole"
      }
    );
    await DeviceSchema.create({
        device_id: "testdevice5",
        system: system3._id,
        update_group: groupOne._id,
        active: true,
        last_reported_online: 1,
        thing_id: "deviceShadow3",
        current_firmware: "NA",
        type: "Gateway"
      }
    );
    ioTDataPlaneClient.reset()
    res = await request(app)
      .get("/api/processDirtySystems")
    expect(res.statusCode).toBe(200);
    shadowUpdates = ioTDataPlaneClient.commandCalls(UpdateThingShadowCommand)
    expect(shadowUpdates.length).toBe(2)
    expectedShadows.forEach(expectedShadow => {
      const contains = shadowUpdates.some(update => update.args[0].input.thingName === expectedShadow);
      expect(contains).toBe(true);
    });
    shadowUpdates.forEach(update => {
      const thingName = update.args[0].input.thingName;
      expect(expectedShadows).toContain(thingName);
    });
    shadowUpdates.forEach(update => {
      payload = JSON.parse(new TextDecoder("utf-8").decode(update.args[0].input.payload))
      expect(payload).toHaveProperty("state")
      expect(payload["state"]).toHaveProperty("desired")
      expect(payload["state"]["desired"]).toHaveProperty("FH")
      const fleetHashVal = payload["state"]["desired"]["FH"]
      if(update.args[0].input.thingName === "deviceShadow1") {
        expect(fleetHashVal).toEqual("1581325666") //hash calculated for above firmware/group pairing
      }
      else if (update.args[0].input.thingName === "deviceShadow2") {
        expect(fleetHashVal).toEqual("0") //hash calculated for above firmware/group pairing
      }
    });
  })
})