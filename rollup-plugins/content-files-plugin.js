import glob from 'glob';
import {promisify} from 'util';
import {promises as fsp} from 'fs';

const globP = promisify(glob);

export default function({input}) {
	return {
		async buildStart() {
			const inputs = await globP(input);
			for(const input of inputs) {
				this.emitFile({
					type: "asset",
					fileName: input,
					source: await fsp.readFile(
				});
			}
		}
	}
}
