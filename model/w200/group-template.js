"use strict";
const database = require("../../services/database.service.js");
require("../../model/template-string"); //DO NOT REMOVE
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const GroupSchema = new Schema({
  group_id: { type: String, required: true, unique: true},
  group_desc: { type: String }
}, { strict: false, minimize: false });

// Create and export the model
module.exports = db.model("Group", GroupSchema, "Groups");