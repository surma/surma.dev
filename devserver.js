const express = require("express");

const app = express();
app.use((req, res, next) => {
  let cache = "no-cache";
  if (/-[0-9a-f]+\.[^.]+$/.test(req.url)) {
    cache = `public,max-age=${365 * 24 * 60 * 60}`;
  }
  res.setHeader("Cache-Control", cache);
  next();
});
app.use(express.static("_site"));
app.listen(8080);
