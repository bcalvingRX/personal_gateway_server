"use strict";
const axios = require("axios");
const AdmZip = require("adm-zip");
const zlib = require("zlib");
const logger = require("../logger");

  async function checkFirmwareExists(revision, filename) {
    try {
      const response = await axios.get(`${process.env.GRG_ENDPOINT}${process.env.GRG_DOWNLOAD_REVISION}`, {
          params: {
            fileType: "original_file",
            revisionId: revision
          },
          headers: {
            "authorization": `Bearer ${process.env.GRG_TOKEN}`
          },
          responseType: "arraybuffer"
        });
      const contentDisposition = response.headers["content-disposition"];
      const match = contentDisposition.match(/filename="([^"]+)"/);
      if (match && match[1] === filename) {
        return filename;
      }
      const zip = new AdmZip(response.data);
      const firmwareFile = zip.getEntries().find((entry) => entry.entryName === filename);
      if (firmwareFile) {
        return firmwareFile.entryName;
      }
      else {
        return null;
      }
    } catch {
      console.warn(`GLG release not found: ${revision} → file '${filename}'`);
      return null;
    }
  }

  async function downloadFirmwareRevision(id, filename) {
    logger.info(`Downloading GLG Doc: ${id}`);
    const response = await axios.get(`${process.env.GRG_ENDPOINT}${process.env.GRG_DOWNLOAD_REVISION}`, {
      params: {
        fileType: "original_file",
        revisionId: id
      },
      headers: {
        "authorization": `Bearer ${process.env.GRG_TOKEN}`
      },
      responseType: "arraybuffer"
    });
    const contentDisposition = response.headers["content-disposition"];
    const match = contentDisposition.match(/filename="([^"]+)"/);
    if (match) {
        return response.data;
    }
    const zip = new AdmZip(response.data);
    const firmwareFile = zip.getEntries().find((entry) => entry.entryName === filename);
    if (firmwareFile !== undefined) {
      let uncompressedData;
      if (firmwareFile.header.method === 8) { // DEFLATE method
        uncompressedData = zlib.inflateRawSync(firmwareFile.getCompressedData());
      } else {
        uncompressedData = firmwareFile.getCompressedData();
      }
      return uncompressedData;
    }
    else {
      throw new Error("Cant find fw file");
    }
  }

  module.exports = {
    checkFirmwareExists,
    downloadFirmwareRevision
  };
