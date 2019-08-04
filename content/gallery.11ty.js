const fsp = require("fs").promises;

async function renderString(template, ...substitutions) {
  substitutions = substitutions.map(async substitution => {
    if (Array.isArray(substitution)) {
      substitution = (await Promise.all(substitution)).join("");
    }
    return substitution;
  });
  substitutions = await Promise.all(substitutions);
  return String.raw(template, ...substitutions);
}

const quality = 40;
const size = 320;

module.exports = class Gallers {
  async render() {
    const gallery = await fsp.readdir("./assets/gallery");
    return renderString`
            <link rel="stylesheet" href="emitChunk(/gallery.css)"/>
            <div class="grid" style="--gallery-size: ${size}px;">
              ${gallery.map(
                item => `
                      <preview-img
                        src="/gallery/${item}"
                        width="${size}"
                        height="${size}"
                        quality="${quality}"
                      ></preview-img>
              `
              )}
            </div>
        `;
  }
};
