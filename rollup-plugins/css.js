import * as fs from "fs";
import { join } from "path";
import { createFilter } from "rollup-pluginutils";
import { parse as parseCSS, generate as serializeCSS, walk as walkCSS } from "css-tree";

const defaultOpts = {
  include: "**/*.css",
  exclude: [],
  minify: true
};

export default function cssPlugin(opts) {
  opts = Object.assign({}, defaultOpts, opts);
  const filter = createFilter(opts.include, opts.exclude);
  
  const contentMap = new Map();
  return {
    name: "css-plugin",
    
    async load(id) {
      if (!filter(id)) {
        return;
      }
      const contents = await fs.promises.readFile(id, { encoding: "utf-8" });
      
      const doc = parseCSS(contents);
      const references = [];
      walkCSS(doc, (node) => {
        if(node.type !== "Url") {
          return
        }
        // FIXME lol
        if(!node.value.value.startsWith(`"/`)) {
          return;
        }
        references.push(node.value);
      });
      
      for(const reference of references) {
        let path = reference.value;
        if(path.startsWith(`"`)) {
          path = path.slice(1);
        }
        if(path.endsWith(`"`)) {
          path = path.slice(0, -1);
        }
        const relativePath = path = path.split("#")[0];
        path = join(
          // FIXME lol
          "/Users/surma/src/github.com/surma/surma.github.io/_site/",
          path
        );
        const contents = fs.promises.readFile(path);
        const assetId = this.emitAsset(relativePath.slice(1), contents);
        reference.value = assetId;
      }
      contentMap.set(id, {doc, references});

      return {
        code: ""
      };
    },
    generateBundle(outputOptions, bundles) {
      for(const bundleId of Object.keys(bundles)) {
        const bundle = bundles[bundleId];
        if(bundle.isAsset) {
          continue;
        }
        if(!contentMap.has(bundle.facadeModuleId)) {
          continue;
        }
        const {doc, references} = contentMap.get(bundle.facadeModuleId);
        debugger;
        for(const referenceAttr of references) {
          referenceAttr.value = `"${this.getAssetFileName(referenceAttr.value)}"`;
        } 
        bundle.code = serializeCSS(doc);
      }
    }
  };
}
