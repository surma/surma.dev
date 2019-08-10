const Cache = require("async-disk-cache");

module.exports = class BigCachedFunction {
  constructor(name) {
    this.cache = new Cache(name, { supportBuffer: true });
  }

  async get(key, fn) {
    let { isCached, value } = this.cache.get(key);
    if (!isCached) {
      value = await fn();
      this.cache.set(key, value);
    }
    return value;
  }
};
