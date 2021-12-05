const { resolve } = require('path')
const { defineConfig } = require('vite')
const glob = require('glob')

const root = resolve(__dirname, ".tmp/");
const files = glob.sync(resolve(__dirname, "./.tmp/**/*.html"))

module.exports = defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, '.tmp/index.html'),
				...Object.fromEntries(
					files.map(path => ([path.slice(root.length + 1), path]))
				)
      }
    }
  }
})
