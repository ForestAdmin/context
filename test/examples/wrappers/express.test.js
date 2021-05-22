/* eslint-disable global-require */
/* eslint-disable no-new */
const fetch = require('node-fetch');

const { newPlan, execute } = require('../../../src');

describe('Examples > Wrappers > express.js', () => {
  class GiveTheSecretHTTPAdapter {
    constructor({
      assertPresent, addHTTPEndpoint, ensureAuthenticated, secret,
    }) {
      assertPresent({ addHTTPEndpoint, ensureAuthenticated, secret });

      this.secret = secret;

      addHTTPEndpoint('GET', '/api/give/secret', ensureAuthenticated, this.giveTheSecret.bind(this));
    }

    giveTheSecret() {
      return { secret: this.secret };
    }
  }

  const makeExpressMiddleware = (call) => (request, response, next) => {
    try {
      return Promise.resolve(call())
        .then((result) => {
          if (result === undefined) next();
          else response.status(200).send(result);
        })
        .catch(next);
    } catch (error) {
      next(error);
      return null;
    }
  };

  const makeExpressMiddlewares = (callStack) => {
    return callStack.map(makeExpressMiddleware);
  };

  describe('GiveTheSecretHTTPAdapter', () => {
    const getExpressAdapterContext = () => ({
      assertPresent: jest.fn(),
      addHTTPEndpoint: jest.fn(),
      ensureAuthenticated: Symbol('ensureAuthenticated'),
      secret: Symbol('secret'),
    });

    describe('constructor', () => {
      it('check dependencies', () => {
        const context = getExpressAdapterContext();

        new GiveTheSecretHTTPAdapter(context);

        const { assertPresent } = context;
        expect(assertPresent).toHaveBeenCalledWith({ ...context, assertPresent: undefined });
      });
      it('bind private \'/api/give/secret\' route', () => {
        const context = getExpressAdapterContext();

        new GiveTheSecretHTTPAdapter(context);

        const { addHTTPEndpoint, ensureAuthMiddleware } = context;
        expect(addHTTPEndpoint).toHaveBeenCalledTimes(1);
        expect(addHTTPEndpoint).toHaveBeenCalledWith(
          'GET',
          '/api/give/secret',
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
        .addFactoryFunction('addHTTPEndpoint', ({ app }) =>
          (method, path, ...callStack) =>
            app[method.toLowerCase()](path, ...makeExpressMiddlewares(callStack))))
      .addStep('commands', (context) => context
        .addValue('serverHandle', {}, { private: true })
        .addFactoryFunction('startHTTP', ({
          assertPresent, http, app, serverHandle,
        }) => {
          assertPresent({ http, app, serverHandle });
          return () => {
            const server = http.createServer(app).listen();
            const { port } = server.address();
            app.set('port', port);
            serverHandle.get = () => server;
            serverHandle.getPort = () => port;
          };
        })
        .addFactoryFunction('stopHTTP', ({ assertPresent, serverHandle }) => {
          assertPresent({ serverHandle });
          return () => serverHandle.get().close();
        })
        .addFactoryFunction('getHTTPPort', ({ assertPresent, serverHandle }) => {
          assertPresent({ serverHandle });
          return () => serverHandle.getPort();
        }))
      .addStep('commonMiddlewares', (context) => context
        .addInstance('ensureAuthenticated', () => {}))
      .addStep('business', (context) => context
        .addValue('secret', 'I love you'))
      .addStep('httpAdapters', (context) => context
        .addUsingClass('expressAdapter', GiveTheSecretHTTPAdapter));

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
