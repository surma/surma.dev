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
			startIndex: 6,
			endIndex: 13,
		}),
		new SocialElement({
			id: 'mail',
			startIndex: 1,
			endIndex: 16,
		}),
		new SocialElement({
			id: 'www',
			startIndex: 7,
			endIndex: 16,
		}),
		new SocialElement({
			id: 'facebook',
			startIndex: 7,
			endIndex: 13,
		}),
		new SocialElement({
			id: 'geeklist',
			startIndex: 6,
			endIndex: 11,
		}),
		new SocialElement({
			id: 'github',
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
