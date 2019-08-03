const fsp = require("fs").promises;

async function renderString(template, ...substitution) {
  substitution = substitution.map(async substitution => {
    if (Array.isArray(substitution)) {
      substitution = (await Promise.all(substitution)).join("");
    }
    return substitution;
  });
  return String.raw(template, await Promise.all(substitution));
}

module.exports = class Gallers {
  async render() {
    const gallery = await fsp.readdir("./assets/gallery");
    return renderString`
            <link rel="stylesheet" href="emitChunk(/gallery.css)"/>
            <div class="grid">
                ${gallery.map(
                  item => `
                        <img 
                            src="/gallery/${item}"
                        >
                `
                )}
            </div>
        `;
  }
};
