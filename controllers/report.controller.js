"use strict";
const reportService = require("../services/report.service");
const logger = require("../logger");

async function get(req, res, next) {
    try {
        logger.info("Getting report templates");
        await reportService.getTemplates(res,
			res.locals.user,
			req.query.name, //its ok to get this outside of input middleware, its optional and only param
			req.query.type, //its ok to get this outside of input middleware, its optional and only param
			function(results) {
                res.json(results);
			},
			function(err) {
				next(err);
			});
    } catch (err) {
        logger.error(`Error retrieving report templates ${err.message}`);
        next(err);
    }
}

async function save(req, res, next) {
    try {
        logger.info("Saving report template");
		await reportService.saveTemplate(res,
			res.locals.user,
			res.locals.data.name,
			res.locals.data.shared,
			res.locals.data.types,
			res.locals.data.items,
			function(results) {
                res.json(results);
			},
			function(err) {
				logger.error(`Error saving report template ${err.message}`);
				next(err);
			});
    } catch (err) {
        logger.error(`Error saving report template ${err.message}`);
        next(err);
    }
}

async function update(req, res, next) {
    try {
        logger.info("Updating report template");
		await reportService.updateTemplate(res,
			res.locals.user,
			res.locals.data.id,
			res.locals.data.shared,
			res.locals.data.types,
			res.locals.data.items,
			function(results) {
                res.json(results);
			},
			function(err) {
				logger.error(`Error updating report template ${err.message}`);
				next(err);
			});
    } catch (err) {
        logger.error(`Error updating report template ${err.message}`);
        next(err);
    }
}


async function deleteTemplate(req, res, next) {
    try {
        logger.info("Deleting firmware template");
        await reportService.deleteTemplate(res,
			res.locals.user,
			res.locals.data.id,
            function(results) {
                res.json(results);
            },
            function(err) {
                next(err);
            });
    } catch (err) {
        logger.error(`Error deleting report template ${err.message}`);
        next(err);
    }
}

module.exports = {
	get,
	save,
	update,
	deleteTemplate
};
