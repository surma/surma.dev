const { abortOnThrow } = require("./utils/http-helpers");
const { requiresAuth } = require("./utils/auth");
const Octokit = require("@octokit/rest");

exports.handler = abortOnThrow(
  requiresAuth(async event => {
    const { access_token, token_type } = event.authToken;
    console.log({ access_token, token_type });
    const octokit = new Octokit({
      auth: `${token_type} ${access_token}`,
      userAgent: "SurmBlog"
    });
    console.log("going");
    const x = await octokit.repos.createOrUpdateFile({
      owner: "surma",
      repo: "surma.github.io",
      path: "test123.txt",
      message: "Commit from web admin interface",
      content: Buffer.from("Ohai test").toString("base64")
    });
    console.log({ x });
    return {
      statusCode: 204,
      body: ""
    };
  })
);
