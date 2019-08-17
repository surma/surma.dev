const { abortOnThrow } = require("./utils/http-helpers");
const { sign, verify } = require("jsonwebtoken");
const fetch = require("node-fetch");
const { SESSION_LENGTH } = require("./utils/config");

exports.handler = abortOnThrow(async event => {
  const { code, state } = event.queryStringParameters;
  if (!code) {
    return {
      statusCode: 400,
      body: "Code missing from callback"
    };
  }

  try {
    verify(state, process.env.SURMBLOG_SECRET);
  } catch (e) {
    return {
      statusCode: 400,
      body: "Bad state"
    };
  }

  const authParams = {
    client_id: process.env.SURMBLOG_GITHUB_APP_ID,
    client_secret: process.env.SURMBLOG_GITHUB_APP_SECRET,
    code
  };

  const body = JSON.stringify(authParams);
  const resp = await fetch(`https://github.com/login/oauth/access_token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Content-Length": body.length
    },
    body
  });
  if (!resp.ok) {
    return {
      statusCode: 400,
      body: `Could not get access token: ${resp.status}`
    };
  }
  const jwt = sign(await resp.json(), process.env.SURMBLOG_SECRET, {
    expiresIn: SESSION_LENGTH
  });
  return {
    statusCode: 307,
    headers: {
      Location: `/admin?${new URLSearchParams({ token: jwt })}`
    },
    body: ""
  };
});
