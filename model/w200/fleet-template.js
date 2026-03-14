"use strict";

const mongoose = require("mongoose");
const autoPopulate = require("mongoose-autopopulate");
const database = require("../../services/database.service.js");

const Schema = mongoose.Schema;
const db = database.getDatabase();

const SystemFleetSchema = new Schema({
  fleet_description: { type: String, required: true },
  fleet_name: { type: String, required: true, unique: true },
  device_groups: [{
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      autopopulate: true
    },
    firmware: {
      type: Schema.Types.ObjectId,
      ref: "DeviceFirmware",
      required: true,
      autopopulate: true
    }
  }]
}, { strict: false, minimize: false });

SystemFleetSchema.plugin(autoPopulate);

module.exports = db.model("SystemFleet", SystemFleetSchema, "SystemFleets");