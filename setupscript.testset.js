const database = require('./services/database.service.js');
const redis = require('./services/redis.service.js');
const awsIoT = require('./services/aws.iot.service.js');
const awsAthena = require('./services/aws.athena.service.js');
const awsSQS = require('./services/aws.sqs.service.js');
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { mockClient } = require('aws-sdk-client-mock');
const env = require('dotenv');
let sQSClient
beforeAll(async () => {
  env.config();
  jest.mock('./middleware/authtoken.middleware', () => ({
    ...jest.requireActual('./middleware/authtoken.middleware'),
      verify: () => (_, res, next) => {
        res.locals.user = 'test.admin1@rxfunction.com';
        next();
      },
      verifyAPIKey: (_, __, next) => next(),
      verifyInstrument: (_, __, next) => next()
  }));
  jest.mock('./middleware/input.middleware', () => ({
    ...jest.requireActual('./middleware/input.middleware'),
      reqCookie: () => [(_, __, next) => next()],
      reqRegToken: () => [(_, __, next) => next()]
  }));
  await database.connectToDatabase()
  await redis.initializeRedisClient()
  await awsIoT.initializeAWS()
  await awsSQS.initializeAWS(10, 1)
  await awsAthena.initializeAWS()
  const mqttRouter = require('./routes/mqtt.route');
  sQSClient = mockClient(SQSClient);
  await awsSQS.startSQSReceiver(async function (payload) {
    await mqttRouter.process(payload)
  })
})

afterAll(async () => {
  jest.clearAllMocks()
  await database.disconnectFromDatabase()
  sQSClient.reset()
  const receiptHandle = `handle_${Date.now()}`
  sQSClient.on(DeleteMessageCommand).resolves({
    Successful: [{ Id: receiptHandle }],
  })
  sQSClient.on(ReceiveMessageCommand).resolves({
      Messages: [ {
        Body: JSON.stringify({status: 'test ending'}),
        ReceiptHandle: receiptHandle,
        MessageAttributes: {
          'X-Custom-Attr': {
            DataType: 'String',
            StringValue: 'value',
          },
        },
      }
    ]
  })
  await awsSQS.stopSQSReceiver()
  await redis.closeRedisClients()
}, 50000)
