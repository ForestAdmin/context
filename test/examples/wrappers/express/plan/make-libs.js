/* eslint-disable global-require */
module.exports = (context) => context
  .addModule('http', () => require('http'))
  .addModule('express', () => require('express'));
