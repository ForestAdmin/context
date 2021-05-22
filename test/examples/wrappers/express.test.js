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
    const myExpressPlan = newPlan()
      .addStep('libs', (context) => context
        .addInstance('http', require('http'))
        .addInstance('express', require('express')))
      .addStep('express', (context) => context
        .addFactoryFunction('app', ({ assertPresent, express }) => {
          assertPresent({ express });
          return express();
        })
        .addValue('secret', 'I love you')
        .addValue('port', 3457)
        .addInstance('ensureAuthMiddleware', (req, res, next) => next())
        .addFactoryFunction('addEndpoint', ({ app }) => (method, path, ...middlewares) => app[method.toLowerCase()](path, ...middlewares))
        .addUsingClass('expressAdapter', MyFirstExpressAdapter)
        .addValue('serverHandle', {})
        .addFactoryFunction('start', ({
          assertPresent, http, app, serverHandle,
        }) => () => {
          assertPresent({ http, app, serverHandle });
          const server = http.createServer(app).listen();
          const { port } = server.address();
          app.set('port', port);
          serverHandle.get = () => server;
          serverHandle.getPort = () => port;
        })
        .addFactoryFunction('stop', ({ assertPresent, serverHandle }) => {
          assertPresent({ serverHandle });
          return () => serverHandle.get().close();
        })
        .addFactoryFunction('getPort', ({ assertPresent, serverHandle }) => {
          assertPresent({ serverHandle });
          return () => serverHandle.getPort();
        }));

    it('should build a minimal working express app', async () => {
      const myApp = execute(myExpressPlan);
      await myApp.start();
      const port = myApp.getPort();

      const answer = await fetch(`http://localhost:${port}/api/test`)
        .then((res) => res.json());
      expect(answer.secret).toStrictEqual('I love you');

      await myApp.stop();
    });
  });
});
