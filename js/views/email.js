define([
  'jquery',
  'underscore',
  'backbone',
  ], function($, _, Backbone) {

    var letterify_string = function(str){
      var c = [];
      $.each(str, function(idx, chr) {
        _(c).push($('<span>')
        .addClass('letter')
        .addClass('letter-'+(idx+1))
        .text(chr));
      });
      return c;
    };
    var EmailView = Backbone.View.extend({

      events: {
        'mouseover #icons #twitter'  : 'highlightTwitter',
        'mouseout #icons #twitter'  : 'hideAll',
      },

      initialize: function() {
        this.render();
      },

      render: function() {
        var letters = letterify_string('surma@surmair.de')
        var $c = $(this.el).find('#email');
        _(letters).each(function(letter) {
          $c.append(letter);
        });
        return this;
      },

      hideAll: function() {
        this.highlightLetters(0, 0);
      },

      highlightTwitter: function() {
        this.highlightLetters(6, 13);
      },

      highlightLetters: function(start, end) {
        var $letters = this.$('#email .letter');
        $letters.removeClass('highlighted');
        for(;start <= end; start++) {
          $letters.filter('.letter-'+start).addClass('highlighted');
        }
      },
    });
    return EmailView;
});

