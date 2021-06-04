/* eslint-disable global-require */
module.exports = (context) => context
  .addInstance('http', require('http'))
  .addInstance('express', require('express'));
