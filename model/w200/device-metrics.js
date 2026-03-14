"use strict";
const database = require("../../services/database.service.js");
require("../../model/template-string"); //DO NOT REMOVE
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const DeviceMetrics = new Schema({
    device_id: String,
    current_system: String,
    firmware: String,
    last_reported_online: Number,
    status: String,
});

//export schema
module.exports = db.model("DeviceMetric", DeviceMetrics, "DeviceMetrics");
