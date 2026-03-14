"use strict";
const database = require("../services/database.service.js");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const TemplateString = new Schema({
  stringID: { type: String, required: true, unique: true, index: true },
  value: { type: String, required: true }
});

//export schema
module.exports = db.model("TemplateString", TemplateString, "TemplateStrings");
