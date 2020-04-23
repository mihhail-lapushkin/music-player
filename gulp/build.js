const gulp = require('gulp');
const tasks = require('./tasks');

module.exports = gulp.series(
  clean = () => tasks.clean('build'),
  mkdir = () => tasks.mkdir('build'),
  gulp.parallel(
    buildScripts  = () => tasks.buildScriptsStream('build'),
    buildStyles   = () => tasks.buildStylesStream('build'),
    copyAssets    = () => tasks.copyPublicStream('build')
  )
);
