(function(Loader) {
	// Less
	Loader
	.script('js/load/less.js');

	// MyTwitter
	Loader
	.script('js/load/jquery.js')
	.script('http://platform.twitter.com/widgets.js')
	.wait()
	.script('js/load/mytwitter.js')
	.wait()
	.script('js/load/showtweet.js');

	// Media Query polyfill
	Modernizr.mq('(min-width)') ||
	Loader
	.script('js/load/respond.js');
})($LAB);
