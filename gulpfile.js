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

gulp.task('build', ['html', 'images']);

gulp.task('html', function() {
  return gulp.src('app/index.html')
    .pipe($.minifyInline())
    .pipe($.minifyHtml())
    .pipe(gulp.dest('dist'));
});

gulp.task('images', function() {
  return gulp.src('app/*.png')
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['build']);
