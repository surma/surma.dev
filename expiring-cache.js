const flatCache = require("flat-cache");

const cache = flatCache.load("surmblog");
module.exports = {
  set(key, value, ttl) {
    cache.setKey(key, { value, expired: new Date().getTime() + ttl });
    cache.save(true);
  },
  get(key) {
    let cachedBlob = cache.getKey(key);
    if (cachedBlob && new Date() > cachedBlob.expired) {
      cache.removeKey(key);
      cachedBlob = null;
    }
    cache.save(true);
    return cachedBlob && cachedBlob.value;
  }
};
