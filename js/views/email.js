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

    var socialTemplate = _.template('\
    <li id="<%=name%>" style="width: <%=width%>%;"> \
      <figure> \
        <img src="img/social/<%=name%>.png" alt="<%=name%>"> \
      </figure> \
    </li>');

    var EmailView = Backbone.View.extend({
      events: {
        'mouseenter #social > li': 'highlight',
        'mouseleave #social > li': 'hide',
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

        var $c = $(this.el).find('#social');
        var numSocialElements = this.options.identity.models.length;
        _.each(this.options.identity.models, function(socialelement) {
          var name = socialelement.id;
          $c.append(socialTemplate({
            name: name,
            width: 99.0/3,
          }));
        });

        return this;
      },

      hide: function() {
        this.highlightLetters(0, 0);
      },

      highlight: function(e) {
        var id = $(e.srcElement);
        if(id.context.tagName.toLowerCase() != "li") {
          id = $(id.parent());
        }
        id = id.attr('id');
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

