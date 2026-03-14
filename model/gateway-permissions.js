"use strict";
const database = require("../services/database.service.js");
const mongoose = require("mongoose");
const Permission = require("../model/permissions.js"); // Import Access schema
const Schema = mongoose.Schema;

var db = database.getDatabase();

const GatewayPermissions = new Schema({
    permissions: { type: [Permission] }
});

//export schema
module.exports = db.model("Permissions", GatewayPermissions, "Permissions");
