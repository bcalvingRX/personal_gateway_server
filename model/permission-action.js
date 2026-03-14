"use strict";
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PermissionAction = new Schema({
  level: { type: Number },
  name: { type: String }
});

module.exports = PermissionAction; // Export to use in UserGroup schema
