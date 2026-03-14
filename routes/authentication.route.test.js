const request = require("supertest");
const managerApp = require("../apps/manager-app.js");
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

describe("Getting API Version", () => {
  test(`Should return ${appVersion}`, async () => {
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/auth/version")
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe(appVersion);
  });
});

describe("Getting Login Info", () => {
  test("Should return user info and roles for authenticated user", async () => {
    const UserGroups = require("../model/user-group");
    const groupOne = await UserGroups.findOne({name: 'Admin Group'});
    const groupTwo = await UserGroups.findOne({name: 'Firmware And Systems'});
    const User = require("../model/user");
    await User.updateOne({user: 'test.admin1@rxfunction.com'}, {group: groupTwo._id });
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/auth/getLoginInfo")
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("name")
    expect(res.body).toHaveProperty("roles")
    expect(res.body.name).toEqual('test.admin1@rxfunction.com')
    expect(JSON.stringify(res.body.roles)).toEqual(JSON.stringify(groupTwo.permissions))
  });

  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'getUserPermissions').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/auth/getLoginInfo")
    expect(res.statusCode).not.toBe(200);
    userService.getUserPermissions.mockRestore();
  });
});