(function($) {

	function shorten(s) {
		return s.replace(/^(https?|ftps?):\/\/(www\.)?/, '');
	}
	var $c = $('#relatedlinks');
	$('#main a').each(function() {
		var $dt = $('<dt>');
		var $dd = $('<dd>');
		var href = shorten($(this).attr('href'));
		var desc = $(this).attr('title');

		$dd.text(desc);
		var $link = $("<a>").attr('href', href).text(href);
		$dt.prepend($link);
		$c.append($dt, $dd);
	});
})(jQuery);
