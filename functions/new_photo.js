const { abortOnThrow } = require("./utils/http-helpers");
const { requiresAuth } = require("./utils/auth");
const { Busyboy } = require("busyboy");
const Octokit = require("@octokit/rest");

exports.handler = abortOnThrow(
  requiresAuth(async event => {
    const { access_token, token_type } = event.authToken;

    if (
      !event.headers["content-type"].startsWith("multipart/form-data") ||
      req.httpMethod !== "POST"
    ) {
      return {
        statusCode: 400,
        body: "Expected multipart/form-data POST request"
      };
    }
    const formParser = new BusyBoy(event.headers);
    const fields = await new Promise(resolve => {
      const fields = new Map();
      formParser.on("file", (fieldname, file, filename, encoding, mimetype) => {
        const buffers = [];
        file.on("data", data => {
          buffer.push(data);
        });
        file.on("end", () => {
          fields.set(fieldname, {
            type: "file",
            filename,
            value: Buffer.concat(buffers)
          });
        });
      });
      formParser.on("field", (fieldname, value) => {
        fields.set(fieldname, {
          type: "field",
          value
        });
      });
      formParser.on("finish", () => resolve(fields));
    });
    return {
      statusCode: 200,
      body: JSON.stringify([...fields.entries()], null, "  ")
    };
    // const octokit = new Octokit({
    //   auth: `${token_type} ${access_token}`,
    //   userAgent: "SurmBlog"
    // });
    // const x = await octokit.repos.createOrUpdateFile({
    //   owner: "surma",
    //   repo: "surma.github.io",
    //   path: "test123.txt",
    //   message: "Commit from web admin interface",
    //   content: Buffer.from("Ohai test").toString("base64")
    // });
    // return {
    //   statusCode: 204,
    //   body: ""
    // };
  })
);
