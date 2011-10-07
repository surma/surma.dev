(function($) {

	function shorten(s) {
		return s.replace(/^(https?|ftps?|mailto):(\/\/)?(www\.)?/, '');
	}

	var $target = $('#relatedlinks');
	if($target.length <= 0) {
		return;
	}
	var $c = $('<dl>').attr('id', 'relatedlinkslist');
	$('#main a').each(function() {
		$(this).attr('target', "_blank");
		var $dt = $('<dt>');
		var $dd = $('<dd>');
		var href = $(this).attr('href');
		var shortlink = shorten(href);
		var desc = $(this).attr('title');

		if(shortlink.length > 30) {
			var len = shortlink.length;
			shortlink = shortlink.substr(0,20)+"..."+shortlink.substr(len-8, len);
		}

		$dd.text(desc);
		var $link = $("<a>")
			.attr('href', href)
			.attr('target', "_blank")
			.text(shortlink);
		$dt.prepend($link);
		$c.append($dt, $dd);
	});
	if($c.children().size() > 0) {
		$c.appendTo('#relatedlinks');
	}
})(jQuery);
