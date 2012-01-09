require.config({
  paths: {
    jquery: 'libs/jquery/jquery-min',
    underscore: 'libs/underscore/underscore-min',
    backbone: 'libs/backbone/backbone-optamd3-min',
  }

});

require(['collections/identity', 'models/social_element', 'views/email'], function(Identity, SocialElement, EmailView) {
	var cnt = 0;
	var id = new Identity([
		new SocialElement({
			id: 'mail',
			link: 'mailto:surma@surmair.de',
			position: cnt++,
			startIndex: 1,
			endIndex: 16,
		}),
		new SocialElement({
			id: 'twitter',
			link: 'http://twitter.com/surmair',
			position: cnt++,
			startIndex: 6,
			endIndex: 13,
		}),
		new SocialElement({
			id: 'www',
			link: 'http://surmair.de',
			position: cnt++,
			startIndex: 7,
			endIndex: 16,
		}),
		new SocialElement({
			id: 'facebook',
			link: 'http://facebook.com/surmair',
			position: cnt++,
			startIndex: 7,
			endIndex: 13,
		}),
		new SocialElement({
			id: 'github',
			link: 'http://github.com/surma',
			position: cnt++,
			startIndex: 7,
			endIndex: 11,
		}),
		new SocialElement({
			id: 'gplus',
			link: 'http://gplus.to/surma',
			position: cnt++,
			startIndex: 7,
			endIndex: 11,
		}),
		new SocialElement({
			id: 'geeklist',
			link: 'http://geekli.st/surma',
			position: cnt++,
			startIndex: 6,
			endIndex: 11,
		}),
		new SocialElement({
			id: 'delicious',
			link: 'http://delicious.com/surmair',
			position: cnt++,
			startIndex: 7,
			endIndex: 13,
		}),
		new SocialElement({
			id: 'tumblr',
			link: 'http://surmair.tumblr.com',
			position: cnt++,
			startIndex: 7,
			endIndex: 13,
		}),
	],
	{
		identity_string: 'surma@surmair.de',
	}
	);
	var ev = new EmailView({identity: id, el: $('#container')});
});
