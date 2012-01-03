require.config({
  paths: {
    jquery: 'libs/jquery/jquery-min',
    underscore: 'libs/underscore/underscore-min',
    backbone: 'libs/backbone/backbone-optamd3-min',
  }

});

require(['collections/identity', 'models/social_element', 'views/email'], function(Identity, SocialElement, EmailView) {
	var id = new Identity([
		new SocialElement({
			id: 'twitter',
			link: 'http://twitter.com/surmair',
			position: 2,
			startIndex: 6,
			endIndex: 13,
		}),
		new SocialElement({
			id: 'mail',
			link: 'mailto:surma@surmair.de',
			position: 0,
			startIndex: 1,
			endIndex: 16,
		}),
		new SocialElement({
			id: 'www',
			link: 'http://surmair.de',
			position: 1,
			startIndex: 7,
			endIndex: 16,
		}),
		new SocialElement({
			id: 'facebook',
			link: 'http://facebook.com/surmair',
			position: 4,
			startIndex: 7,
			endIndex: 13,
		}),
		new SocialElement({
			id: 'geeklist',
			link: 'http://geekli.st/surma',
			position: 6,
			startIndex: 6,
			endIndex: 11,
		}),
		new SocialElement({
			id: 'github',
			link: 'http://github.com/surma',
			position: 5,
			startIndex: 7,
			endIndex: 11,
		}),
		new SocialElement({
			id: 'gplus',
			link: 'http://gplus.to/surma',
			position: 3,
			startIndex: 7,
			endIndex: 11,
		}),
	],
	{
		identity_string: 'surma@surmair.de',
	}
	);
	var ev = new EmailView({identity: id, el: $('#container')});
});
