define([
  'jquery',
  'underscore',
  ], function($, _) {
  return {
    _letterify_content: function(idx, c) {
      var $c = $(c);
      var text = $c.text().trim();
      $c.text('');
      $.each(text, function(idx, chr) {
        $('<span>')
        .addClass('letter')
        .addClass('letter-'+idx)
        .text(chr)
        .appendTo($c);
      });
    },

    apply: function(selector) {
      $(selector).each(this._letterify_content);
    },
  };
});
