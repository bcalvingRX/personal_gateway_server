"use strict";
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserAccess = new Schema({
  name: { type: String },
  location: { type: String }
}, { _id: false });

module.exports = UserAccess; // Export to use in UserGroup schema
