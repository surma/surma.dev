(function(Loader) {
	// Less
	Loader
	.script('js/load/less.js');

	// Media Query polyfill
	Modernizr.mq('(min-width)') ||
	Loader
	.script('js/load/respond.js');
}($LAB));
