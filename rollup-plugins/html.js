import * as fs from "fs";
import { join } from "path";
import { createFilter } from "rollup-pluginutils";
import { parse as parseHTML, serialize as serializeHTML } from "parse5";
import { stringLiteral } from "babel-types";

const defaultOpts = {
  include: "**/*.html",
  exclude: [],
  minify: true
};

function findAllNodes(node, predicate) {
  const result = [];
  if (predicate(node)) {
    result.push(node);
  }
  if (node.childNodes) {
    node.childNodes.forEach(node => {
      result.push(...findAllNodes(node, predicate));
    });
  }
  return result;
}

function isExternalScript(node) {
  return node.nodeName.toLowerCase() === "script" &&
    node.attrs.some(attr => attr.name === "src");
}

function isExternalStylesheet(node) {
  return node.nodeName.toLowerCase() === "link" &&
    node.attrs.some(attr => attr.name === "rel" && attr.value === "stylesheet");
}

async function findScriptTags(doc, importee) {
  return Promise.all(findAllNodes(doc, isExternalScript).map(async node => {
    let attr = node.attrs.find(attr => attr.name === "src");
    let path = attr.value;
    if (path.startsWith("/")) {
      path = join(
        // FIXME lol
        "/Users/surma/src/github.com/surma/surma.github.io/_site/",
        path
      );
    }
    const { id: importId } = await this.resolve(path, importee);
    const chunkId = this.emitChunk(importId);
    // attr.value = `${placeholderPrefix}${chunkId}${placeholderSuffix}`;
    attr.value = chunkId;
    return attr;
  }));
}

async function findStylesheets(doc, importee) {
  return await Promise.all(findAllNodes(doc, isExternalStylesheet).map(async node => {
    let attr = node.attrs.find(attr => attr.name === "href");
    let path = attr.value;
    if (path.startsWith("/")) {
      path = join(
        // FIXME lol
        "/Users/surma/src/github.com/surma/surma.github.io/_site/",
        path
      );
    }
    const { id: importId } = await this.resolve(path, importee);
    const contents = await fs.promises.readFile(importId, "utf-8");
    const assetId = this.emitAsset(attr.value.substr(1), contents);
    // attr.value = `${placeholderPrefix}${assetId}${placeholderSuffix}`;
    attr.value = assetId;
    return attr;
  }));
}

export default function htmlPlugin(opts) {
  opts = Object.assign({}, defaultOpts, opts);
  const filter = createFilter(opts.include, opts.exclude);
  
  const contentMap = new Map();
  return {
    name: "html-plugin",
    
    async load(id) {
      if (!filter(id)) {
        return;
      }
      const contents = await fs.promises.readFile(id, { encoding: "utf-8" });
      const doc = parseHTML(contents);

      const [scriptChunks, styleChunks] = await Promise.all([
        findScriptTags.call(this, doc, id),
        findStylesheets.call(this, doc, id)
      ]);
      
      contentMap.set(id, [doc, scriptChunks, styleChunks]);
      // Generate some dummy imports in case rollup needs those
      return {
        code: ""/*[
          ...scriptChunks.map((attr, i) => `import(import.meta.ROLLUP_CHUNK_URL_${attr.value});`),
          ...styleChunks.map((attr, i) => `// import.meta.ROLLUP_ASSET_URL_${attr.value}`),
        ].join("\n")*/
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
        const [doc, scriptChunks, styleChunks] = contentMap.get(bundle.facadeModuleId);
        for(const scriptChunk of scriptChunks) {
          scriptChunk.value = this.getChunkFileName(scriptChunk.value);
        } 
        for(const styleChunk of styleChunks) {
          styleChunk.value = this.getAssetFileName(styleChunk.value);
        } 
        bundle.code = serializeHTML(doc);
      }
    }
  };
}
