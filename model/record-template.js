"use strict";
const database = require("../services/database.service.js");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const RecordTemplate = new Schema({
    name: String,
    owner: String,
    shared: Boolean,
    types: {type: "array", items: {type: "string"}},
	items: [Object]
}, { strict: false });

//export schema
module.exports = db.model("RecordTemplate", RecordTemplate, "RecordTemplates");
