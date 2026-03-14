"use strict";
const database = require("../../services/database.service.js");
require("../../model/template-string"); //DO NOT REMOVE
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const SystemMetrics = new Schema({
    system_name: String,
    lastUpdatedTimestamp:Number
}, { strict: false});

//export schema
module.exports = db.model("SystemMetric", SystemMetrics, "SystemMetrics");
