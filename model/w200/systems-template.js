"use strict";
const database = require("../../services/database.service.js");
require("../../model/template-string"); //DO NOT REMOVE
const autoPopulate = require("mongoose-autopopulate");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const SystemSchema = new Schema({
  system_name: { type: String, required: true, unique: true },
  fleet: {
    type: Schema.Types.ObjectId,
    ref: "SystemFleet",
    autopopulate: true
  },
  active: { type: Boolean, required: true },
  dirty_flag: { type: Boolean, required: true }
}, { strict: false, minimize: false });

SystemSchema.plugin(autoPopulate);

// Create and export the model
module.exports = db.model("System", SystemSchema, "Systems");