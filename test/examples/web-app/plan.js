/* eslint-disable global-require */
const makeExpressApp = require('./make-express-app');
const makeExpressAddHTTPEndPoint = require('./make-express-add-http-endpoint');
const makeCommands = require('./make-commands');

module.exports = (plan) => plan
  .addStep('storage', (planStorage) => planStorage)
  .addStep('business', (planBusiness) => planBusiness)
  .addStep('http', (planHTTP) => planHTTP
    .addStep('express', (planExpress) => planExpress
      .addStep('libs', (libsPlan) => libsPlan
        .addInstance('http', () => require('http'))
        .addInstance('express', () => require('express')))
      .addStep('app', (context) => context
        .addUsingFunction('app', makeExpressApp)
        .addUsingFunction('addHTTPEndpoint', makeExpressAddHTTPEndPoint))
      .addStep('commands', makeCommands)))
  .addStep('http-adapter', (planAdapter) => planAdapter);
