const { join } = require("path");
const { URLSearchParams } = require("url");
const { FUNCTIONS_ROOT } = require("./utils/config");

exports.handler = async event => {
  const params = {
    client_id: process.env.SURMBLOG_GITHUB_APP_ID,
    redirect_uri: `${process.env.SURMBLOG_HOST}${join(
      FUNCTIONS_ROOT,
      "callback"
    )}`
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
};
