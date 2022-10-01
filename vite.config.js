import * as parse5 from "parse5";
import * as glob from "glob";
import {resolve} from "path";
import {readFile} from "fs/promises";

const root = resolve(__dirname, ".tmp/");
const entryPoints = glob.sync(resolve(__dirname, "./.tmp/**/*.html"));

export default {
	root: ".tmp",
	build: {
		target: "esnext",
		assetsInlineLimit: 0,
    emptyOutDir: true,
		outDir: "../_site",
		rollupOptions: {
      input: {
        main: resolve(__dirname, ".tmp/index.html"),
        ...Object.fromEntries(
          entryPoints.map((path) => [path.slice(root.length + 1), path])
        ),
      },
    },
	},
	plugins: [
		{
			name: 'social-image',
			transformIndexHtml: {
				async transform(html, {bundle}) {
					// console.log(bundle);
					const rx = /<meta property="og:image" content="([^"]+)">/g;
					while(true) {
						const matches = rx.exec(html);
						if(!matches) return;
						const imgUrl = new URL(matches[1]);
						const path = `.${imgUrl.pathname}`;
						const file = await readFile(`.tmp${imgUrl.pathname}`);
						bundle[path] = {
							type: 'asset',
							source: file,
							fileName: path,
						};						
					}
				}
			}
		},
		{
			name: 'vue-parser-workaround',
			transformIndexHtml: {
        enforce: 'pre',
				transform(html) {
					const ast = parse5.parse(html);
					return parse5.serialize(ast);
				}
			}
		}
	]
}
