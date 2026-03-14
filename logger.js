"use strict";
const winston = require("winston");
const moment = require("moment-timezone");

const timezoned = () => {
    return moment().tz("America/Chicago").format("YYYY-MM-DD hh:mm:ss A");
};

const logger = winston.createLogger({
    level: process.env.NODE_ENV === "test" ? "emerg" : "debug",
    format: winston.format.combine(
        winston.format.timestamp({ format: timezoned }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let metaLog;
            if (meta && Object.keys(meta).length > 0) {
                try {
                    metaLog = JSON.stringify(meta);
                }
                catch {
                    //do nothing
                }
            }
            return `${timestamp} ${level.toUpperCase()}: ${message} ${(metaLog) ? metaLog : ""}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ],
});

module.exports = logger;
