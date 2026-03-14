"use strict";
const mongoose = require("mongoose");
const logger = require("../logger");

var database;

async function connectToDatabase() {
	try {
		database = await mongoose.createConnection(process.env.MONGO_ENDPOINT, {
			sslValidate: true
		});
	} catch (error) {
		logger.info(`Failed to connect to DB: ${error}`);
	}
	database.on("error", console.error.bind(console, "connection error"));
}

async function disconnectFromDatabase() {
	try {
		database.close();
	} catch (error) {
		logger.info(`Failed to disconnect from DB: ${error}`);
	}
}

function getDatabase() {
	return database;
}

module.exports = {

    connectToDatabase,
	disconnectFromDatabase,
	getDatabase
};
