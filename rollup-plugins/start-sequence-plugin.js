export default function buildStartSequencePlugin() {
  return {
    name: "build-start-sequence-plugin",
    async buildStart(options, ...args) {
      for (const plugin of options.plugins) {
        if (plugin.buildStartSequence) {
          await plugin.buildStartSequence.call(this, options, ...args);
        }
      }
    }
  };
}
