const { resolve } = require("path");
const { defineConfig } = require("vite");
const glob = require("glob");

const root = resolve(__dirname, ".tmp/");
const entryPoints = glob.sync(resolve(__dirname, "./.tmp/**/*.html"));

module.exports = defineConfig({
  build: {
    assetsInlineLimit: 0,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, ".tmp/index.html"),
        ...Object.fromEntries(
          entryPoints.map((path) => [path.slice(root.length + 1), path])
        ),
      },
    },
  },
});
