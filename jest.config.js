"use strict";
module.exports = {
  maxWorkers: 1,
  setupFilesAfterEnv: [
    "./setupscript.testset.js"
  ],
  collectCoverageFrom: [
    "apps/**/*.{js,jsx,ts,tsx}",
    "controllers/**/*.{js,jsx,ts,tsx}",
    "middleware/**/*.{js,jsx,ts,tsx}",
    "model/**/*.{js,jsx,ts,tsx}",
    "routes/**/*.{js,jsx,ts,tsx}",
    "services/**/*.{js,jsx,ts,tsx}",
    "*.{js,jsx,ts,tsx}",
    "!<rootDir>/node_modules/"
  ],
  collectCoverage: true,
  coverageReporters: ["json", "html"],
};
