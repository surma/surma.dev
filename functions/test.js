const { eventToRequest, Response } = require("./aws-to-node");

function myHandler(req, res) {
  res.send("Hello world");
}

exports.handler = async event => {
  const req = eventToRequest(event);
  const res = new Response();
  myHandler(req, res);
  return res.convert();
};
