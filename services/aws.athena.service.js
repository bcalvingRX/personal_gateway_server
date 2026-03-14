"use strict";
const { GetObjectCommand, HeadObjectCommand, PutObjectCommand, CopyObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const logger = require("../logger");

var s3Client;

function initializeAWS() {
    try {
        if (process.env.AWS_ATHENA_ACCESS_ID && process.env.AWS_ATHENA_ACCESS_KEY) {
            s3Client = new S3Client({
                credentials: {
                    accessKeyId: process.env.AWS_ATHENA_ACCESS_ID,
                    secretAccessKey: process.env.AWS_ATHENA_ACCESS_KEY,
                },
                region: process.env.AWS_REGION,
            });
        }
        else {
            s3Client = new S3Client({
                region: process.env.AWS_REGION,
            });
        }
        logger.info("AWS Athena connected!");

    } catch (error) {
        logger.error(`Failed to connect to AWS Athena: ${error}`);
    }
}

async function resetS3Expiration(bucket, file) {
    try {
        await s3Client.send(new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${file}`,
            Key: file,
            TaggingDirective: "COPY"
        }));
        console.log("Object copied to the same location, resetting expiration timer.");
    } catch (err) {
        console.error("Error copying object to reset expiration:", err);
        throw err;
    }
}

async function uploadToS3(data, bucket, file) {
    try {
        console.log(`Uploading data to bucket: ${bucket} at ${file}`);
        await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: file,
            Body: data
        }));
        console.log("File uploaded successfully.");
    } catch (err) {
        console.error("Error uploading to bucket: ", err);
        throw err;
    }
}

async function getS3DataExpiry(bucket, file) {
    try {
        const headObject = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: file }));

        if (headObject.Expiration) {
            const expiryDateStr = headObject.Expiration.match(/expiry-date="(.*?)"/)[1];
            const expiryDate = new Date(expiryDateStr);
            const currentDate = new Date();
            const secondsUntilExpiry = Math.floor((expiryDate - currentDate) / 1000);
            return secondsUntilExpiry > 0 ? secondsUntilExpiry : 0;
        } else {
            console.log("No expiration metadata found.");
            return null;
        }
    } catch {
        console.log("File Not Found");
        return null;
    }
}

async function getEphemeralURL(bucket, file, offset, durationInSec) {
    console.log(`Creating URL for bucket: ${bucket}, key:${file}, range:${offset}, duration: ${durationInSec}`);
    try {
        // Generate the pre-signed URL with a 10-minute expiration
        let command = null;
        if (offset !== "0") { //input sanitation enforces strings
            command = new GetObjectCommand({ Bucket: bucket, Range: `bytes=${offset}-`, Key: file });
        }
        else {
            command = new GetObjectCommand({ Bucket: bucket, Key: file });
        }
        const url = await getSignedUrl(s3Client, command, { expiresIn: durationInSec });
        return url;
    } catch (err) {
        console.error("Error generating pre-signed URL:", err);
        throw err;
    }
}

module.exports = {
    initializeAWS,
    uploadToS3,
    getS3DataExpiry,
    resetS3Expiration,
    getEphemeralURL
};
