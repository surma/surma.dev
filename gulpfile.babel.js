import gulp from 'gulp';
import browserSync from 'browser-sync';

// Pipelines for each file extension
import pipelines from './gulppipelines.babel.js';

// Glob pattern that matches every file not handled by
// the pipelines defined in `buldingPipelines`
const unhandledFilesGlob = [
  'app/**/*',
  ...Object.keys(pipelines)
    .map(extension => '!app/**/*.' + extension),
  'bower?components/**/*'
];

const defaultBrowserSyncConfig = {
  reloadOnRestart: true,
  open: false
};

// Serve the built app
gulp.task('serve', ['build'], () => {
  const options = Object.assign({}, defaultBrowserSyncConfig, {
    server: {
      baseDir: 'dist'
    }
  });
  const browserSyncInstance = browserSync.create();
  browserSyncInstance.init(options);

  Object.keys(pipelines).forEach(extension => {
    gulp.watch([
      'app/**/*.' + extension
    ], [extension, browserSyncInstance.reload]);
  });
  gulp.watch(unhandledFilesGlob,
    ['unhandled-files', browserSyncInstance.reload]);
});

// Build the app and put it in `dist`
gulp.task('default', ['build']);
gulp.task('build', [...Object.keys(pipelines), 'unhandled-files']);

// Generate tasks defined in `gulppipelines.babel.js`
Object.keys(pipelines).forEach(extension => {
  gulp.task(extension, () => {
    // Instantiate pipeline
    const pipeline = pipelines[extension]();

    var stream = gulp.src([
      'app/**/*.' + extension
    ]);
    stream = pipeline.reduce((stream, step) => stream.pipe(step), stream);
    return stream.pipe(gulp.dest('dist'));
  });
});

// Just copy all the files not explicitly processed in `pipelines`
gulp.task('unhandled-files', () => {
  return gulp.src(unhandledFilesGlob, {
    dot: true
  })
  .pipe(gulp.dest('dist'));
});
