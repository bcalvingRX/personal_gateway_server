"use strict";
const database = require("../services/database.service.js");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var db = database.getDatabase();

const User = new Schema({
    user: String,
    group: { type: Schema.Types.ObjectId, ref: "UserGroup" }
});

//export schema
module.exports = db.model("User", User, "Users");
