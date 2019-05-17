import gulp from 'gulp';
import browserSync from 'browser-sync';
import {exec} from 'child_process';
import gulpLoadPlugins from 'gulp-load-plugins';
import pkg from './package.json';
import s3conf from './s3conf.json';
import hugoconf from './hugoconf.json';
import fs from 'fs';
import runSequence from 'run-sequence';

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

const $ = gulpLoadPlugins();

const defaultBrowserSyncConfig = {
  reloadOnRestart: true,
  open: false
};

Object.keys(s3conf).forEach(key => {
  s3conf[key] = process.env[key.toUpperCase()] || s3conf[key];
});
hugoconf.baseurl = `https://${s3conf.bucket}`

// Serve the built app
gulp.task('serve', ['build', 'hugo:watch'], () => {
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

gulp.task('hugo:config', () => {
  fs.writeFileSync('config.json', JSON.stringify(hugoconf));
});

gulp.task('hugo:watch', ['hugo:config'], () => {
  return exec('hugo --watch');
});

gulp.task('hugo:build', ['hugo:config'], () => {
  return exec('hugo');
});

// Build the app and put it in `dist`
gulp.task('default', ['build']);
gulp.task('build', (cb) => {
  runSequence('hugo:build',
    [...Object.keys(pipelines), 'unhandled-files'],
    cb);
});

// Generate tasks defined in `gulppipelines.babel.js`
Object.keys(pipelines).forEach(extension => {
  gulp.task(extension, () => {
    // Instantiate pipeline
    const pipeline = pipelines[extension]();

    var stream = gulp.src([
      'app/**/*.' + extension
    ]);
    stream = pipeline.reduce((stream, step) =>
      stream.pipe($.if(file => !/_static\./.test(file.relative), step)), stream);
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

gulp.task('deploy:all', () => {
  return gulp.src('dist/**/*')
  .pipe($.filter(['**', '!**/*.wasm']))
  .pipe($.s3(s3conf));
});

gulp.task('deploy:wasm', () => {
  return gulp.src('dist/**/*.wasm')
    .pipe($.s3(s3conf, {headers: {
      "Content-Type": "application/wasm"
    }}));
});

gulp.task('deploy', () => {
  return runSequence('deploy:all', 'deploy:wasm');
});
