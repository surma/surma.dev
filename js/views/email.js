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
        'mouseover #icons div': 'highlight',
        'mouseout #icons div': 'hide',
      },

      initialize: function() {
        this.render();
      },

      render: function() {
        var $c = $(this.el).find('#email');
        var letters = letterify_string(this.options.identity.identity_string);
        _(letters).each(function(letter) {
          $c.append(letter);
        });

        var $c = $(this.el).find('#icons');
        _.each(this.options.identity.models, function(socialelement) {
         var name = socialelement.id;
         $('<div>').attr('id', name).text(name).appendTo($c);
        });

        return this;
      },

      hide: function() {
        this.highlightLetters(0, 0);
      },

      highlight: function(e) {
        var id = $(e.srcElement).attr('id');
        var socialelement = this.options.identity.get(id);
        this.highlightLetters(socialelement.get('startIndex'), socialelement.get('endIndex'));
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

