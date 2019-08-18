const PREFIX = "env:";
export default function() {
  return {
    name: "env-plugin",
    resolveId(id) {
      if (!id.startsWith(PREFIX)) {
        return;
      }
      return id;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) {
        return;
      }
      return Object.entries(process.env)
        .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
        .join("\n");
    }
  };
}
