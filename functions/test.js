const { adapter } = require("./aws-to-node");

function myHandler(req, res) {
  res.send(`${process.env.SURMBLOG_GITHUB_APP_ID}`);
}

exports.handler = adapter(myHandler);
