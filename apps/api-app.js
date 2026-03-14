"use strict";
const port = 5445;
const express = require("express");
const limiter = require("../middleware/rate-limit.middleware");
const errorHandler = require("../middleware/error-handler.middleware");
const expressWinston = require("express-winston");
const winston = require("winston");
const logger = require("../logger");
const bodyParser = require("body-parser");
const cors = require("cors");

async function getApp(dev) {
    const app = express();

    if (!dev) {
        app.use(cors({
            origin: "*",
            methods: ["GET"],
            credentials: true
        }));

        app.use(limiter.apiRateLimiter);
    }
    else {
        app.use(cors({
            origin: "https://localhost:4200",
            methods: ["GET"],
            credentials: true
        }));
    }
    // interpret http bodies as json
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());

    app.use((req, res, next) => {
        logger.info(`REQUEST: ${req.method} ${req.url}`, { body: req.body });
        next();
    });

    // Log responses
    const httpLogger = expressWinston.logger({
        winstonInstance: logger,
        msg: "RESPONSE {{req.method}} {{req.url}}",
        expressFormat: false,
        colorize: false,
        meta: true,
        dynamicMeta: (req) => {
            return {
                body: req.method === "POST" ? req.body : {},
                req: {}
            };
        },
        requestWhitelist: ["method", "url"],
        bodyWhitelist: [],
        responseWhitelist: ["statusCode"]
    });
    app.use(httpLogger);

    const apiRouter = require("../routes/api.route");
    app.use("/api", apiRouter);

    app.use(expressWinston.errorLogger({
        winstonInstance: logger,
        transports: [
            new winston.transports.Console({
                json: true,
                colorize: true
            })
        ]
    }));

    app.use(errorHandler);

    return app;
}

module.exports = {
    port,
    getApp
};
