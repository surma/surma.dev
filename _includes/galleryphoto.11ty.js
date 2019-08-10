const lfsBucket = require("../lfs-bucket");
const BigCachedFunction = require("../big-cached-function");

const cache = new BigCachedFunction("photos");

module.exports = async function({ file }) {
  const photo = await cache.get(file, () => lfsBucket.get(file));

  return `<img src="data:image/jpeg;base64,${photo.toString("base64")}">`;
};
