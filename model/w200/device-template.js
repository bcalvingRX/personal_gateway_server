"use strict";
const database = require("../../services/database.service.js");
require("../../model/template-string"); //DO NOT REMOVE
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoPopulate = require("mongoose-autopopulate");

var db = database.getDatabase();

const DeviceSchema = new Schema({
    device_id: { type: String, required: true, unique: true, index: true },
    system: {
        type: Schema.Types.ObjectId,
        ref: "System",
        autopopulate: true
    },
    update_group: {
        type: Schema.Types.ObjectId,
        ref: "Group",
        autopopulate: true
    },
    active: { type: Boolean, required: true },
    last_reported_online: Number,
    thing_id: String,
    current_firmware: { type: String, required: true },
    type: { type: String, required: true }
}, { strict: false, minimize: false });

// Enable autopopulate plugin
DeviceSchema.plugin(autoPopulate);

// Create and export the model
module.exports = db.model("Device", DeviceSchema, "Devices");