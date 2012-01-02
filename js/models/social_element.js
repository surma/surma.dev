define([
  'jquery',
  'underscore',
  'backbone',
  ], function($, _, Backbone) {

    var SocialElement = Backbone.Model.extend({
      defaults: {
        startIndex: 0,
        endIndex: 0,
      },

      initialize: function() {
      },

    });
    return SocialElement;
});

