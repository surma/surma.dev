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

    var get_sourceid = function(e) {
        var id = $(e.srcElement);
        while (id.get(0).nodeName.toLowerCase() != "li") {
          id = $(id.parent());
        }
        id = id.attr('id');
        return id;
    }

    var socialTemplate = _.template('\
    <li id="<%=name%>" style="width: <%=width%>%;"> \
      <figure> \
        <img src="img/social/<%=name%>.png" alt="<%=name%>"> \
      </figure> \
    </li>');

    var EmailView = Backbone.View.extend({
      events: {
        'mouseenter #social > li > figure': 'highlight',
        'mouseleave #social > li > figure': 'hide',
        'click #social > li > figure': 'open',
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

      open: function(e) {
        var id = get_sourceid(e);
        var socialelement = this.options.identity.get(id);
        window.open(socialelement.get('link'));
      },

      hide: function() {
        this.highlightLetters(0, 0);
      },

      highlight: function(e) {
        var id = get_sourceid(e);
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

