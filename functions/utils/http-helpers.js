function runMiddleware(req, res, mw) {
  return new Promise(async resolve => {
    await mw(req, res, (...args) => resolve(args.length > 0 ? args : [req, res]));
    resolve([req, res]);
  });
}

function chain(...mws) {
  return async (req, res) => {
    for(const mw of mws) {
      [req, res] = await runMiddleware(req, res, mw);
    }
  }
}

module.exports = { runMiddleware, chain };
