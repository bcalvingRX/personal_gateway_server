"use strict";
const database = require("../services/database.service.js");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const APIKey = new Schema({
    key: String,
    type: String
});

//export schema
module.exports = db.model("APIKey", APIKey, "APIKeys");
