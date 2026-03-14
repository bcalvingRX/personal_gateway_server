"use strict";
const { StatusCodes } = require("http-status-codes");

function errorHandler(err, req, res) {
    const statusCode = err.status || err.statusCode || res.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const response = {
        error: "RxFunction Gateway Error",
        message: err.message,
    };
    res.status(statusCode).json(response);
}

module.exports = errorHandler;
