"use strict";
const limiter = require("express-rate-limit");

// GLOBAL - Limit each IP to 3600 total requests per 5 minutes (approx 12 a second for 5 min straight)
// if we need more fancy rate limiting, consider rate-limiter-flexible, express-brute, or rate-limiter
const rateLimiter = limiter({
	windowMs: 5 * 60 * 1000,
	max: 3600,
	message: {
		message: "Too many requests"
	},
	standardHeaders: "draft-7", // draft-6: RateLimit-* headers; draft-7: combined RateLimit header
	legacyHeaders: false, // X-RateLimit-* headers
});

// AUTH - Limit each IP to 5 failed requests per 1 minutes for authorization to prevent brute force attacks
const authRateLimiter = limiter({
	windowMs: 1 * 60 * 1000,
	max: 5,
	skipSuccessfulRequests: true,
	message: {
		message: "Too many requests"
	},
	standardHeaders: "draft-7", // draft-6: RateLimit-* headers; draft-7: combined RateLimit header
	legacyHeaders: false, // X-RateLimit-* headers
});

// API - Limit each IP to 1 requests per 1 minute
const apiRateLimiter = limiter({
	windowMs: 1 * 60 * 1000,
	max: 1,
	skipSuccessfulRequests: false,
	message: {
		message: "Too many requests"
	},
	standardHeaders: "draft-7", // draft-6: RateLimit-* headers; draft-7: combined RateLimit header
	legacyHeaders: false, // X-RateLimit-* headers
});

module.exports = {
	rateLimiter,
	authRateLimiter,
	apiRateLimiter
};
