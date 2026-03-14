"use strict";
const axios = require("axios");
const logger = require("../logger");

  async function checkFirmwareExists(org, repo, tagname, filename) {
    try {
      const response = await axios.get(
        `${process.env.GITHUB_ENDPOINT}${org}/${repo}${process.env.GITHUB_GET_RELEASES}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
          }
        }
      );
      for (const release of response.data) {
        if (release.tag_name === tagname) {
          const asset = release.assets.find(releaseAsset => releaseAsset.name === filename);
          if (asset) {
            return asset.id;
          }
        }
      }

      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn(`GitHub release not found: ${repo} → tag '${tagname}'`);
        return null; // Tag or repo doesn't exist — valid "not found"
      }

      logger.error("Unexpected error checking firmware:", error.message);
      throw error; // Unexpected error
    }
  }

  async function downloadFirmwareRevision(id) {
    const response = await axios.get(`${process.env.GITHUB_ENDPOINT}${process.env.GITHUB_DOWNLOAD_REVISION}/${id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
        "Accept": "application/octet-stream"
      },
      responseType: "arraybuffer"
    });
    if (response) {
      return response.data;
    }
    else {
      return null;
    }
  }

  module.exports = {
    checkFirmwareExists,
    downloadFirmwareRevision
  };
