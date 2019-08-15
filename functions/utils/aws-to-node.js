const { EventEmitter } = require("events");
const { URLSearchParams, parse } = require("url");
const fromEntries = require("./from-entries");

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
  const {
    path,
    queryStringParameters,
    httpMethod: method,
    isBase64Encoded
  } = event;

  const headers = Object.assign({}, event.headers);
  const query = new URLSearchParams(queryStringParameters);
  const protocol = `${headers["x-forwarded-proto"]}:`;
  const host = `${headers["host"]}:`;
  const port = headers["x-forwarded-port"];
  const httpVersion = "1.1";
  const url = parse(`${protocol}//${host}:${port}/${path}?${query}`);

  const req = new EventEmitter();
  Object.assign(req, {
    method,
    headers,
    url,
    httpVersion,
    query: fromEntries(query.entries())
  });

  const body = Buffer.from(event.body, isBase64Encoded ? "base64" : "utf8");
  headers["Content-Length"] = Buffer.byteLength(body);
  Promise.resolve()
    .then(() => req.emit("data", body))
    .then(() => req.emit("end"));

  return req;
}

function adapter(h) {
  return async event => {
    const req = eventToRequest(event);
    const res = new Response();
    await h(req, res);
    return res.convert();
  };
}

module.exports = {
  eventToRequest,
  Response,
  adapter
};
