const { sign } = require("aws4");
const { abortOnThrow } = require("./utils/http-helpers");
const { requiresAuth } = require("./utils/auth");

exports.handler = abortOnThrow(
  requiresAuth(async event => {
    if (event.headers["content-type"] !== "application/json") {
      return {
        statusCode: 400,
        body: "Expecting JSON payload"
      };
    }
    const req = JSON.parse(event.body);
    const signedReq = sign(req, {
      accessKeyId: process.env.SURMBLOG_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SURMBLOG_AWS_SECRET_ACCESS_KEY
    });
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(signedReq)
    };
  })
);
