const Cache = require("async-disk-cache");

module.exports = class BigCachedFunction {
  constructor(name) {
    this.inProgress = new Map();
    this.cache = new Cache(name, { supportBuffer: true, location: ".cache" });
  }

  async get(ikey, fn) {
    if (this.inProgress.has(ikey)) {
      return this.inProgress.get(ikey);
    }
    const p = new Promise(async resolve => {
      let { isCached, key, value } = await this.cache.get(ikey);
      if (!isCached) {
        value = await fn();
        this.cache.set(ikey, value);
        key = await this.cache.get(ikey).key;
      }
      resolve({ key, value });
    });
    this.inProgress.set(ikey, p);
    p.then(() => this.inProgress.delete(ikey));
    return p;
  }
};
