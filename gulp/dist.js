const gulp = require('gulp');
const tasks = require('./tasks');

module.exports = gulp.series(
  clean = () => tasks.clean('dist'),
  mkdir = () => tasks.mkdir('dist'),
  gulp.parallel(
    buildScripts  = () => tasks.buildScriptsStream('dist'),
    buildStyles   = () => tasks.buildStylesStream('dist'),
    copyAssets    = () => tasks.copyPublicStream('dist')
  )
);
