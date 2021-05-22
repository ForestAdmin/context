/* eslint-disable global-require */
/* eslint-disable no-new */
const fetch = require('node-fetch');

const { newPlan, execute } = require('../../../src');

describe('Examples > Wrappers > express.js', () => {
  class MyFirstExpressAdapter {
    constructor({
      assertPresent, addEndpoint, ensureAuthMiddleware, secret,
    }) {
      assertPresent({ addEndpoint, ensureAuthMiddleware, secret });
      this.secret = secret;

      addEndpoint('GET', '/api/test', ensureAuthMiddleware, this.test.bind(this));
    }

    test(request, response) {
      response.status(200).send({ secret: this.secret });
    }
  }

  describe('MyFirstExpressAdapter', () => {
    const getExpressAdapterContext = () => ({
      assertPresent: jest.fn(),
      addEndpoint: jest.fn(),
      ensureAuthMiddleware: Symbol('ensureAuthMiddleware'),
      secret: Symbol('secret'),
    });

    describe('constructor', () => {
      it('check dependencies', () => {
        const context = getExpressAdapterContext();

        new MyFirstExpressAdapter(context);

        const { assertPresent } = context;
        expect(assertPresent).toHaveBeenCalledWith({ ...context, assertPresent: undefined });
      });
      it('bind private \'/api/test\' route', () => {
        const context = getExpressAdapterContext();

        new MyFirstExpressAdapter(context);

        const { addEndpoint, ensureAuthMiddleware } = context;
        expect(addEndpoint).toHaveBeenCalledTimes(1);
        expect(addEndpoint).toHaveBeenCalledWith(
          'GET',
          '/api/test',
          ensureAuthMiddleware,
          expect.anything(),
        );
      });
    });
  });

  describe('Express plan', () => {
    it('should build a small express app', async () => {
      const assertServerStarted = jest.fn();

      const myExpressPlan = newPlan()
        .addStep('express', (context) => context
          .addValue('secret', 'I love you')
          .addValue('port', 3457)
          .addInstance('app', require('express')())
          .addInstance('middlewareOne', (req, res, next) => next())
          .addFactoryFunction('addEndpoint', ({ app }) => (method, path, ...middlewares) => app[method.toLowerCase()](path, ...middlewares))
          .addUsingClass('expressAdapter', MyFirstExpressAdapter)
          .addFactoryFunction('start', ({ app, port }) => () => {
            return new Promise((resolve) => {
              const server = app.listen(port, () => {
                assertServerStarted(port);
                resolve(server);
              });
            });
          }));

      const myApp = execute(myExpressPlan);
      const server = await myApp.start();
      expect(assertServerStarted).toHaveBeenCalledWith(3457);

      const answer = await fetch('http://localhost:3457/api/test').then((res) => res.json());
      expect(answer.secret).toStrictEqual('I love you');

      server.close();
    });
  });
});
