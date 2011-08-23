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

	// Comments
	Loader
	.script('http://connect.facebook.net/en_US/all.js#xfbml=1');

	// Media Query polyfill
	Modernizr.mq('(min-width)') ||
	Loader
	.script('js/load/respond.js');
})($LAB);
