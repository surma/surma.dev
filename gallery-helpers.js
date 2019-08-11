const lfsBucket = require("./lfs-bucket");
const BigCachedFunction = require("./big-cached-function");

const { readFile, writeFile, access } = require("fs").promises;
const { dirname, join } = require("path");
const { promisify } = require("util");

const mkdirp = require("mkdirp");
const { tmpName } = require("tmp");
const { convert } = require("imagemagick");

const mkdirpP = promisify(mkdirp);
const tmpNameP = promisify(tmpName);
const convertP = promisify(convert);

const cache = new BigCachedFunction("photos");

async function exists(path) {
  return access(path)
    .then(() => true)
    .catch(() => false);
}

async function downloadGalleryPhoto({ page, file }) {
  const { value: photo } = await cache.get(file, () => lfsBucket.get(file));
  const outputDir = dirname(page.outputPath);
  await mkdirpP(outputDir);
  const outputPath = join(outputDir, file);
  if (!(await exists(outputPath))) {
    await writeFile(outputPath, photo);
  }
}
async function thumbGalleryPhoto({ file, quality, width, height, resolution }) {
  const key = `${file}:${width}:${height}:${quality}:${resolution}`;
  return cache.get(key, async () => {
    const { key: photoPath } = await cache.get(file, () => lfsBucket.get(file));
    const tmpName = await tmpNameP();
    await convertP([
      photoPath,
      "-resize",
      `${Math.floor(width * resolution)}x${Math.floor(height * resolution)}`,
      "-quality",
      `${quality}`,
      tmpName
    ]);
    return await readFile(tmpName);
  });
}
module.exports = { downloadGalleryPhoto, thumbGalleryPhoto };
