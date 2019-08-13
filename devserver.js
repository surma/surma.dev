const { join } = require("path");
const express = require("express");
const {
  serveFunctions
} = require("netlify-dev-plugin/src/utils/serve-functions");
const proxy = require("express-http-proxy");

async function run() {
  const { port } = await serveFunctions({
    functionsDir: join(__dirname, "functions")
  });
  const app = express();
  app.use("/.netlify/functions/", proxy(`localhost:${port}`));
  app.use((req, res, next) => {
    let cache = "no-cache";
    if (/-[0-9a-f]+\.[^.]+$/.test(req.url)) {
      cache = `public,max-age=${365 * 24 * 60 * 60}`;
    }
    res.setHeader("Cache-Control", cache);
    next();
  });
  app.use(express.static("_site"));
  const server = app.listen(8080);
  console.log(`Server running on http://localhost:${server.address().port}`);
}
run();
