"use strict";
const database = require("../../services/database.service.js");
require("../../model/template-string"); //DO NOT REMOVE
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const DeviceFirmwareSchema = new Schema({
  firmware_id: { type: String, required: true, unique: true},
  firmware_desc: { type: String, required: true },
  source: { type: String, required: true },
  file: { type: String, required: true },
  revision: { type: String, required: false },
  org: { type: String, required: false },
  repo: { type: String, required: false },
  tag: { type: String, required: false }
}, { strict: false, minimize: false });

// Create and export the model
module.exports = db.model("DeviceFirmware", DeviceFirmwareSchema, "DeviceFirmware");