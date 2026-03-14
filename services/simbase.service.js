"use strict";
const axios = require("axios");
const { StatusCodes } = require("http-status-codes");
const logger = require("../logger");

  module.exports = {
    getSIMDetails: function(res, sim, success, reject) {
        return axios.get(`${process.env.SIMBASE_ENDPOINT}${process.env.SIMBASE_SIM_DETAILS}/${sim}`, {
            headers: {
              "x-api-key": process.env.SIMBASE_TOKEN
            }
          }).then(function (result) {
            res.status(StatusCodes.OK);
            success(result.data);
          }).catch(function (error) {
            res.status(StatusCodes.SERVICE_UNAVAILABLE);
            logger.info(error);
            reject(error);
          });
    }
};
