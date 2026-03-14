const devices = db.Devices.find({});
db.createCollection('DeviceLogs', { capped: false });

const crypto = require('crypto');

let globalBlockNum = 541;

const payloads = [
  "Diagnostics: Battery Voltage Low",
  "Diagnostics: Sensor Fault",
  "Diagnostics: Temperature Warning",
  "Event: System Error 3",
  "Event: Unexpected Reboot",
  "Event: BLE Disconnect",
  "Logistics: Replacement Issued",
  "Logistics: Returned to Service",
  "Update: Firmware v2.1.3 Applied",
  "Update: Bootloader Refreshed",
  "Health: Self-Test Passed",
  "Health: Self-Test Failed",
  "Security: Certificate Renewed",
  "Security: Tamper Alert",
];

function generateFakeTransactionId() {
  return crypto.randomBytes(32).toString('hex');
}

function generateFakeSignature() {
  const buf = crypto.randomBytes(64);
  return buf.toString('base64');
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateTimestamps(startDate, count, intervalMinutes) {
  const timestamps = [];
  let date = new Date(startDate);
  for (let i = 0; i < count; i++) {
    timestamps.push(new Date(date).toISOString());
    date.setMinutes(date.getMinutes() + intervalMinutes);
  }
  return timestamps;
}

devices.forEach(device => {
  const logsPerDevice = 15;
  const timestamps = generateTimestamps(new Date('2022-01-01T08:00:00Z'), logsPerDevice, 60);
  const deviceLogs = [];

  // First log: Provisioning
  deviceLogs.push({
    blockNum: globalBlockNum++,
    channelHeaderDate: timestamps[0],
    creatorId: device.device_id,
    channelId: `${device.device_id}_trans`,
    endorsements: 2,
    transactionId: generateFakeTransactionId(),
    signature: generateFakeSignature(),
    payload: "Provisioning: Device Registered",
  });

  // Additional logs
  for (let i = 1; i < logsPerDevice; i++) {
    deviceLogs.push({
      blockNum: globalBlockNum++,
      channelHeaderDate: timestamps[i],
      creatorId: device.device_id,
      channelId: `${device.device_id}_trans`,
      endorsements: getRandomInt(1, 3),
      transactionId: generateFakeTransactionId(),
      signature: generateFakeSignature(),
      payload: payloads[getRandomInt(0, payloads.length - 1)],
    });
  }

  db.DeviceLogs.insertMany(deviceLogs);
});
