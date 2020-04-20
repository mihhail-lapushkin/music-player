const gulp = require('gulp');
const express = require('express');
const tasks = require('./tasks');

const buildScripts  = () => tasks.buildScriptsStream('dev');
const buildStyles   = () => tasks.buildStylesStream('dev');
const copyPublic    = () => tasks.copyPublicStream('dev');

module.exports = gulp.series(
  clean = () => tasks.clean('dev'),
  mkdir = () => tasks.mkdir('dev'),
  gulp.parallel(
    buildScripts,
    buildStyles,
    copyPublic
  ),
  gulp.parallel(
    serve = () => {
      express()
        .use(express.static('dev'))
        .listen(8080);
    },
    watch = () => {
      gulp.watch('src/scripts/**/*', buildScripts);
      gulp.watch('src/styles/**/*', buildStyles);
      gulp.watch('src/public/**/*', copyPublic);
    }
  )
);
