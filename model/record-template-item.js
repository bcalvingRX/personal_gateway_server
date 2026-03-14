"use strict";
const Ajv = require("ajv");
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

var RecordTemplateItemSchema = {
	type: "object",
	properties: {
		type: {type: "string"},
		styles: {type: "array", items: {type: "string"}},
		key: {type: "string"},
		content: {type: "string"},
		label: {type: "string"},
		keyed: {type: "boolean"},
		tabLevel: {type: "number"},
	},
	required: ["type", "styles", "key", "content", "label", "keyed", "tabLevel"],
};

function validate(data) {
	const validateSchema = ajv.compile(RecordTemplateItemSchema);
	return validateSchema(data);
}

//export schema
module.exports = {
    validate
};
