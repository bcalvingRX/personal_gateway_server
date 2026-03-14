"use strict";
const database = require("../../services/database.service.js");
require("../../model/template-string"); //DO NOT REMOVE
const autoPopulate = require("mongoose-autopopulate");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const StateRecordSchema = new Schema({
    state_hash: String,
    state_type: String,
    hash_content: {
        type: [[String]],
    }
}, { strict: false, minimize: false });

StateRecordSchema.plugin(autoPopulate);

// Create and export the model
module.exports = db.model("StateRecord", StateRecordSchema, "StateRecords");