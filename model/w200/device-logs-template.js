"use strict";
const database = require("../../services/database.service.js");
require("../../model/template-string"); //DO NOT REMOVE
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const DeviceLogsSchema = new Schema({
    blockNum: Number,
    channelHeaderDate: String,
    creatorId: String,
    channelId: String,
    endorsements: Number,
    transactionId: String,
    signature: String,
    payload: String
}, { strict: false, minimize: false });

// Create and export the model
module.exports = db.model("DeviceLog", DeviceLogsSchema, "DeviceLogs");