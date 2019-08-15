const { adapter } = require("./aws-to-node");

function myHandler(req, res) {
  res.send("Hello world");
}

exports.handler = adapter(myHandler);
