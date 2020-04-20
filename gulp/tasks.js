const gulp = require('gulp');
const gulpRename = require('gulp-rename');
const gulpLog = require('gulplog');
const fs = require('fs');
const del = require('del');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');

module.exports = {
  clean: del,
  mkdir: dir => fs.promises.mkdir(dir, { recursive: true }),

  buildStylesStream: dest =>
    gulp.src('src/styles/root.css')
      .pipe(
        require('gulp-postcss')([
          require('postcss-import')(),
          require('postcss-custom-properties')({ preserve: false }),
          require('postcss-calc')(),
          require('autoprefixer')()
        ])
      )
      .pipe(gulpRename('styles.css'))
      .pipe(gulp.dest(dest)),

  buildScriptsStream: dest =>
    browserify({
      entries: 'src/scripts/root.js',
      debug: true,
      transform: [babelify.configure({
        presets: [ '@babel/env' ]
      })]
    })
    .bundle()
    .pipe(source('code.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .on('error', gulpLog.error)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(dest)),

  copyPublicStream: dest =>
    gulp.src('src/public/**/*')
      .pipe(gulp.dest(dest))
};
