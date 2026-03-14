"use strict";
const RecordTemplate = require("../model/record-template");
let stringify = require("json-stringify-safe");
const RecordTemplateItem = require("../model/record-template-item");
const { StatusCodes } = require("http-status-codes");
const logger = require("../logger");

async function getTemplates(res, user, id, type, success, error) {
    logger.info("Pulling record templates");
	if (id) {
		logger.info(`pulling id: ${id}`);
        await RecordTemplate.findById(id).then(data => {
			logger.info(`templates got:  ${stringify(data)}`);
            res.status(StatusCodes.OK);
            success([data]);
        }).catch(err => {
            res.status(StatusCodes.SERVICE_UNAVAILABLE);
            error(`ERROR Retrieving Record Templates: ${err}`);
        });
    }
	else
	{
		let query = RecordTemplate.find({
			$or: [{
				   "owner": user
				}, {
					"shared": true
				}
			]
		});

		if (type) {
			query.where("types").in(["Any", type]);
		}

		await query.exec().then(data => {
			logger.info(`templates got: ${stringify(data)}`);
			res.status(StatusCodes.OK);
			success(data);
		}).catch(err => {
			res.status(StatusCodes.SERVICE_UNAVAILABLE);
			error(`ERROR Retrieving Record Templates: ${err}`);
		});
	}
}

async function saveTemplate(res, user, name, shared, types, items, success, error) {
	logger.info(`Saving template: ${stringify(items)}`);
	const itemJSON = JSON.parse(items);
	let validItems = itemJSON.length > 0;
	if (validItems) {
		for (const templateItem of itemJSON) {
			logger.info(`Saving template item: ${stringify(templateItem)}`);
			validItems = RecordTemplateItem.validate(templateItem);
			if (!validItems) {
				 break;
			}
		}
	}
	if (validItems) {
		const newTemplate = new RecordTemplate({
			name: name,
			owner: user,
			shared: shared,
			types: types,
			items: itemJSON
		});
		await newTemplate.save().then(() => {
			res.status(StatusCodes.OK);
			success("New Template added");
		}).catch(err => {
			res.status(StatusCodes.SERVICE_UNAVAILABLE);
			error(`ERROR Creating Template:  ${err}`);
		});
	}
	else {
		res.status(StatusCodes.BAD_REQUEST);
		error("Missing required record template item fields");
	}
}

async function updateTemplate(res, user, id, shared, types, items, success, error) {
	logger.info(`Updating template:  ${stringify(items)}`);
	const itemJSON = JSON.parse(items);
	let validItems = itemJSON.length > 0;
	if (validItems) {
		for (const templateItem of itemJSON) {
			logger.info(`Updating template item: ${stringify(templateItem)}`);
			validItems = RecordTemplateItem.validate(templateItem);
			if (!validItems) {
				 break;
			}
		}
	}
	if (validItems) {
		await RecordTemplate.findOneAndUpdate(
		{
			"_id": id,
			owner: user
		},
		{
			shared: shared,
			types: types,
			items: itemJSON
		}).then(() => {
			res.status(StatusCodes.OK);
			success("Template Updated Successfully");
		}).catch(err => {
			res.status(StatusCodes.SERVICE_UNAVAILABLE);
			error(`ERROR Updating Template: ${err}`);
		});
	}
	else {
		res.status(StatusCodes.BAD_REQUEST);
		error("Unable to update Template");
	}
}

async function deleteTemplate(res, user, id, success, error) {
    logger.info("Deleting a report template");
	await RecordTemplate.deleteOne(
	{
		$and: [
			{
				_id: id
			},
			{
				owner: user
			}
		]
	}).then(() => {
		res.status(StatusCodes.OK);
		success("Report template removed");
	}).catch(err => {
		res.status(StatusCodes.SERVICE_UNAVAILABLE);
		error(`ERROR Deleting report template: ${err}`);
	});
}

module.exports = {
    getTemplates,
	saveTemplate,
	updateTemplate,
	deleteTemplate
};
