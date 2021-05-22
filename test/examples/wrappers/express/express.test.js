/* eslint-disable global-require */
/* eslint-disable no-new */
const fetch = require('node-fetch');
const makeLibs = require('./plan/make-libs');
const makeExpress = require('./plan/make-express');
const makeCommands = require('./plan/make-commands');
const makeBusiness = require('./plan/make-business');
const makeAdapters = require('./plan/make-adapters');

const { newPlan, execute } = require('../../../../src');

describe('Examples > Wrappers > express.js', () => {
  describe('Express plan', () => {
    const myExpressPlan = newPlan()
      .addStep('libs', makeLibs)
      .addStep('express', makeExpress)
      .addStep('commands', makeCommands)
      .addStep('business', makeBusiness)
      .addStep('adapters', makeAdapters);

    it('should build a minimal working express app', async () => {
      const myApp = execute(myExpressPlan);
      await myApp.startHTTP();

      const { secret } = await fetch(`http://localhost:${myApp.getHTTPPort()}/api/give/secret`)
        .then((res) => res.json());

      expect(secret).toStrictEqual('I love you');

      await myApp.stopHTTP();
    });
  });
});
