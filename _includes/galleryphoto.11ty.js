const { downloadGalleryPhoto } = require("../gallery-helpers");
const { exists } = require("../fs-helpers");

module.exports = async function({ page, file }) {
  await downloadGalleryPhoto({ page, file });
  return `<img src="./${file}">`;
};
