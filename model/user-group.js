"use strict";
const database = require("../services/database.service.js");
const mongoose = require("mongoose");
const UserAccess = require("../model/user-access.js"); // Import Access schema
const Schema = mongoose.Schema;

var db = database.getDatabase();

const UserGroup = new Schema({
    name: String,
    canDelete: Boolean,
    canEdit: Boolean,
    permissions: { type: [UserAccess] }
});

//export schema
module.exports = db.model("UserGroup", UserGroup, "UserGroups");
