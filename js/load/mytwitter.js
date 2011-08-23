MyTwitter = (function($) {
	return {
		is_marked: function(pos, entities) {
			var result = null;
			$.each(entities, function(type, entity) {
				$.each(entity, function() {
					if(pos == this['indices'][0]) {
						result = {
							type: type,
							data: this
						}
					}
				});
			});
			return result;
		},

		markup_text: function(tweettext, entities) {
			var new_text = '';
			for(var i = 0; i < tweettext.length; i++) {
				var entry = MyTwitter.is_marked(i, entities);
				if(entry !== null) {
					switch(entry.type) {
						case 'media':
						case 'urls':
							new_text += '<a href="'+entry.data.url+'" class="tweet-link '+entry.type+'">'+entry.data.display_url+'</a>';
						break;
						case 'user_mentions':
							new_text += '<a href="http://twitter.com/#!/'+entry.data.screen_name+'" class="tweet-link user_mention">@'+entry.data.screen_name+'</a>';
						break;
						case 'hashtag':
							new_text += '<a href="http://twitter.com/#!/search?q=%23'+entry.data.text+'" class="tweet-link hashtag">#'+entry.data.text+'</a>';
						break;

					}
					i = entry.data.indices[1];
				} else {
					new_text += tweettext[i];
				}
			}
			return new_text;
		},

		cb: function(tweets) {
			var tweet = tweets[0],
			$c = this.$container;

			var user = tweet['user'];
			$c.find('img.profileimg').attr('src', user.profile_image_url);
			$c.find('.name').text(user.name);
			$c.find('.screen_name').text('@'+user.screen_name);
			$c.find('.userdescription').text(user.description);

			var date = new Date(tweet['created_at']);
			$c.find('.date').text(date.toLocaleString());

			var markup = MyTwitter.markup_text(tweet['text'], tweet['entities']);
			$c.find('.tweet').html(markup);
		},

		getTweet: function(username, obj) {
			this.$container = $(obj);
			var $script = $('<script>');
			$script.attr('src', 'https://api.twitter.com/1/statuses/user_timeline.json' +
				'?screen_name=' + username +
				'&count=1' +
				'&include_entities=true' +
				'&callback=MyTwitter.cb');
			$script.appendTo($('head'));
		}
	};
}(jQuery));
