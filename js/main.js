(function(Loader) {
	// Less
	Loader.script('/js/load/less.js');

	// MyTwitter
	Loader
	.script('/js/load/jquery.js')
	.wait()
	.script('/js/load/mytwitter.js')
	.script('/js/load/linkextractor.js')
	.wait()
	.script('/js/load/showtweet.js');

	// Social Plugins
	Loader.script('http://platform.twitter.com/widgets.js')
	Loader.script('https://apis.google.com/js/plusone.js')
	Loader.script('http://connect.facebook.net/en_US/all.js#xfbml=1');

	// Media Query polyfill
	Modernizr.mq('(min-width)')
	|| Loader.script('/js/load/respond.js');
})($LAB);
