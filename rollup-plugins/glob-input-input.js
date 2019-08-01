import { promisify } from 'util';
import path from 'path';

import glob from 'glob';

const globP = promisify(glob);

export default function globInputPlugin(globInput) {
  return {
    name: 'glob-input-plugin',
    async buildStartSequence(options) {
      const paths = await globP(globInput);
      const entries = paths.map(inputPath => [
        inputPath
          .split(path.sep)
          .slice(1)
          .join(path.sep)
          // Remove extension from name.
          // Otherwise, Rollup seems to branch on html/css vs js extensions.
          // This way we can normalise it.
          // It's added again in html-css-plugin's generateBundle.
          .replace(/\.[^\.]+$/, ''),
        inputPath,
      ]);
      options.input = { ...options.input, ...Object.fromEntries(entries) };
    },
  };
}
