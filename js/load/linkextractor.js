(function($) {

	function shorten(s) {
		return s.replace(/^(https?|ftps?|mailto):(\/\/)?(www\.)?/, '');
	}

	var $c = $('<dl>').attr('id', 'relatedlinkslist');
	$('#main a').each(function() {
		var $dt = $('<dt>');
		var $dd = $('<dd>');
		var href = $(this).attr('href');
		var shortlink = shorten(href);
		var desc = $(this).attr('title');

		$dd.text(desc);
		var $link = $("<a>").attr('href', href).text(shortlink);
		$dt.prepend($link);
		$c.append($dt, $dd);
	});
	if($c.children().size() > 0) {
		$c.appendTo('#relatedlinks');
	}
})(jQuery);
