"use strict";
const port = 9422;
const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const limiter = require("../middleware/rate-limit.middleware");
const errorHandler = require("../middleware/error-handler.middleware");
const RedisStore = require("connect-redis").default;
const redis = require("../services/redis.service.js");
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
            methods: ["GET", "POST", "DELETE"],
            credentials: true
        }));
        app.use("../api/auth", limiter.authRateLimiter);
        app.use(limiter.rateLimiter);
    }
    else {
        app.use(cors({
            origin: "https://localhost:4200",
            methods: ["GET", "POST", "DELETE"],
            credentials: true
        }));
    }
    // interpret http bodies as json
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use(cookieParser());

    const redisClient = redis.getSessionClient();
    const redisStore = new RedisStore({
        client: redisClient,
        prefix: "sess"
    });

    app.use(session({
        store: redisStore,
        secret: process.env.SESSION_STORE_SECRET,
        saveUninitialized: true,
        resave: false,
        unset: "destroy",
        name: "sessID",
        cookie: {
            secure: true,
            maxAge: 864000000, //10 days
            sameSite: "strict"
        }
    }));
    // Log requests
    app.use((req, res, next) => {
        let user = null;
        if (req.session && req.session.user) {
            user = req.session.user;
        }
        logger.info(`REQUEST${user ? ` (${user})` : ""}: ${req.method} ${req.url}`, { body: req.body });
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

    const fwUpdate = require("../routes/firmwareupdate.route");
    const userRouter = require("../routes/usermanagement.route");
    const authRouter = require("../routes/authentication.route");
    const reportRouter = require("../routes/report.route");
    const systemRouter = require("../routes/system.route");

    app.use("/api/fw", fwUpdate);
    app.use("/api/users", userRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/report", reportRouter);
    app.use("/api/system", systemRouter);

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
