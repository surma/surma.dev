const { EventEmitter } = require("events");
const { parse } = require("url");

class Response {
  constructor() {
    this._buffer = [];
    this._headers = {};
    this.finished = false;
    this.statusCode = 200;
    this.statusMessage = "OK";
  }

  setHeader(name, value) {
    this._headers[name] = value;
  }

  end() {
    this.finished = true;
  }

  send(data) {
    this.write(data);
    this.end();
  }

  write(chunk, callback = () => {}) {
    if (!Buffer.isBuffer(chunk)) {
      chunk = Buffer.from(chunk);
    }
    this._buffer.push(chunk);
    callback();
  }

  convert() {
    return {
      statusCode: this.statusCode,
      body: Buffer.concat(this._buffer).toString("base64"),
      isBase64Encoded: true,
      headers: this._headers
    };
  }
}

function eventToRequest(event) {
  const headers = Object.assign({}, event.headers);

  const {
    path,
    queryStringParameters,
    httpMethod: method,
    isBase64Encoded
  } = event;
  const query = new URLSearchParams(queryStringParameters);
  const protocol = `${headers["x-forwarded-proto"]}:`;
  const host = `${headers["host"]}:`;
  const port = headers["x-forwarded-port"];
  const httpVersion = "1.1";
  let complete = false;
  const url = parse(`${protocol}//${host}:${port}/${path}?${query}`);

  const req = new EventEmitter();
  Object.assign(req, {
    method,
    headers,
    url,
    httpVersion,
    complete
  });

  let body = event.body;
  if (event.body) {
    body = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  Promise.resolve()
    .then(() => req.emit("data", body))
    .then(() => req.emit("end"));

  return req;
}

module.exports = {
  eventToRequest,
  Response
};
