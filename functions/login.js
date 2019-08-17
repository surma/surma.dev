const { abortOnThrow } = require("./utils/http-helpers");
const { join } = require("path");
const { sign } = require("jsonwebtoken");
const uuid = require("uuid").v4;
const { URLSearchParams } = require("url");
const { FUNCTIONS_ROOT } = require("./utils/config");

exports.handler = abortOnThrow(async event => {
  const params = {
    client_id: process.env.SURMBLOG_GITHUB_APP_ID,
    redirect_uri: `${process.env.SURMBLOG_HOST}${join(
      FUNCTIONS_ROOT,
      "callback"
    )}`,
    state: sign({ nonce: uuid() }, process.env.SURMBLOG_SECRET, {
      expiresIn: 30
    })
  };

  return {
    statusCode: 307,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${new URLSearchParams(
        params
      )}`
    },
    body: ""
  };
});
