"use strict";
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const PermissionAction = require("../model/permission-action.js"); // Import Access schema

const Permission = new Schema({
  description: { type: String },
  location: { type: String },
  names: [PermissionAction]
});

module.exports = Permission; // Export to use in UserGroup schema
