const fsp = require("fs").promises;

module.exports = class Gallers {
    async render() {
        const gallery = await fsp.readdir("./static/gallery");
        return `>> ${gallery.join("|")}`
    }
}