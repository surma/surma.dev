const dict: {[x: string]: string} = {
	"Delta 3200": "delta3200",
	"Ilford HP5+": "ilfordhp5",
	"Kodak Tri-X 400": "kodaktrix",
	"T-Max 100": "tmax100",
	"Cinestill Df96": "cinstilldf96",
	"Kodak D-76": "kodakd76",
	"Kodak HC-110": "kodakhc100",
	"Ilford ID-11": "ilfordid11",
	"Ilford Ilfosol 3": "ilfordilfosol3",
	"Ilfotec DDX": "ilfotecddx",
	"Ilfotec HC": "ilfotechc",
	"Ilford Microphen": "ilfordmicrophen",
	"Ilford Perceptol": "ilfordperceptol",
	"Compard R09": "compardr09",
	"Kodak T-Max": "kodaktmax",
	"Kodak XTOL": "kodakxtol",
};

for(const [key, value] of Object.entries(dict)) {
	dict[key.replaceAll(" ", "-")] = value;
}

for await (const {name} of Deno.readDir(".")) {
	if(!name.endsWith(".avif")) continue;
	let [film, dev] = name.slice(10).slice(0, -5). split("---");
	film = dict[film];
	dev = dict[dev];
	await Deno.rename(name, `${film}-${dev}.avif`);
}

