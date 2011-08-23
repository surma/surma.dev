(function($) {
	var username = $.grep($(".twitter-follow-button").attr('src').split('&'), function(elem, idx){return elem.indexOf('screen_name') == 0;})[0].split('=')[1];
	MyTwitter.getTweet(username, '.mytwitter');
})(jQuery);
