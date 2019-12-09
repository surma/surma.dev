require("dotenv").config();

const S3 = require("aws-sdk/clients/s3");
const config = {
  region: process.env.SURMBLOG_AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.SURMBLOG_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SURMBLOG_AWS_SECRET_ACCESS_KEY
  }
};
const Bucket = process.env.SURMBLOG_AWS_BUCKET_NAME;

const s3 = new S3(config);

const api = {
  async list() {
    const data = await s3.listObjectsV2({ Bucket }).promise();
    return data.Contents.map(entry => entry.Key);
  },
  async get(Key) {
    console.log("Downloading", Key);
    const data = await s3.getObject({ Bucket, Key }).promise();
    return data.Body;
  }
};

module.exports = api;
