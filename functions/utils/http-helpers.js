function runMiddleware(req, res, mw) {
  return new Promise(async resolve => {
    await mw(req, res, resolve);
    resolve();
  });
}

module.exports = { runMiddleware };
