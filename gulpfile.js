var browserSync = require('browser-sync').create();
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var pkg = require('./package.json');

gulp.task('serve', function() {
  browserSync.init({
    server: {
      baseDir: 'app'
    }
  });
  $.watch('./app/*', browserSync.reload);
});
