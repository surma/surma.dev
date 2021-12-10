const imgs = {
	"delta3200": [
	"cinstilldf96",
	"kodakd76",
	"kodakhc100",
	"ilfordid11",
	"ilfordilfosol3",
	"ilfotecddx",
	"ilfotechc",
	"ilfordmicrophen",
	"ilfordperceptol",
	"compardr09",
	"kodaktmax",
	"kodakxtol"],
	"ilfordhp5": [
	"cinstilldf96",
	"kodakd76",
	"kodakhc100",
	"ilfordid11",
	"ilfordilfosol3",
	"ilfotecddx",
	"ilfotechc",
	"ilfordmicrophen",
	"ilfordperceptol",
	"compardr09",
	"kodaktmax",
	"kodakxtol"],
	"kodaktrix": [
	"cinstilldf96",
	"kodakd76",
	"kodakhc100",
	"ilfordid11",
	"ilfordilfosol3",
	"ilfotecddx",
	"ilfotechc",
	"ilfordmicrophen",
	"ilfordperceptol",
	"compardr09",
	"kodaktmax",
	"kodakxtol"],
	"tmax100": [
	"cinstilldf96",
	"kodakd76",
	"kodakhc100",
	"ilfordid11",
	"ilfordilfosol3",
	"ilfotecddx",
	"ilfotechc",
	"ilfordmicrophen",
	"ilfordperceptol",
	"compardr09",
	"kodaktmax",
	"kodakxtol"]
}

let s = "{";
for(const [film, devs] of Object.entries(imgs)) {
	s += `${JSON.stringify(film)}: {`;
	for(const dev of devs) {
		s += `${JSON.stringify(dev)}: new URL("./${film}-${dev}.avif", import.meta.url),`;
	}
	s += "},"
}
s+= "}";
console.log(s);