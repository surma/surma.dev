const lfsBucket = require("../lfs-bucket");
const BigCachedFunction = require("../big-cached-function");

const { writeFile, access } = require("fs").promises;
const { dirname, join } = require("path");
const { promisify } = require("util");

const mkdirp = require("mkdirp");

const mkdirpP = promisify(mkdirp);

const cache = new BigCachedFunction("photos");

async function exists(path) {
  return access(path)
    .then(() => true)
    .catch(() => false);
}

module.exports = async function({ page, file }) {
  const photo = await cache.get(file, () => lfsBucket.get(file));
  const outputDir = dirname(page.outputPath);
  await mkdirpP(outputDir);
  const outputPath = join(outputDir, file);
  if (!(await exists(outputPath))) {
    await writeFile(outputPath, photo);
  }
  return `<img src="emitChunk(./${file})">`;
};
