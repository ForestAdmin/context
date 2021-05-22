/* eslint-disable global-require */
/* eslint-disable no-new */
const fetch = require('node-fetch');

const { newPlan, execute } = require('../../../src');

class MyFirstExpressAdapter {
  constructor({
    middlewareOne, addEndpoint, secret,
  }) {
    addEndpoint('GET', '/api/test', middlewareOne, this.test.bind(this));
    this.secret = secret;
  }

  test(request, response) {
    response.status(200).send({ secret: this.secret });
  }
}

describe('Examples > express app', () => {
  describe('MyFirstExpressAdapter', () => {
    it('should use middlewareOne', () => {
      const middlewareOne = Symbol('middlewareOne');
      const addEndpoint = jest.fn();
      const context = {
        middlewareOne,
        addEndpoint,
        secret: null,
      };
      new MyFirstExpressAdapter(context);
      expect(addEndpoint).toHaveBeenCalledTimes(1);
      expect(addEndpoint).toHaveBeenCalledWith('GET', '/api/test', middlewareOne, expect.anything());
    });
  });
  it('should build a small express app', async () => {
    const assertServerStarted = jest.fn();

    const myAppPlan = newPlan()
      .addStep('express', (context) => context
        .addValue('secret', 'I love you')
        .addValue('port', 3457)
        .addInstance('app', require('express')())
        .addInstance('middlewareOne', (req, res, next) => next())
        .addFactoryFunction('addEndpoint', ({ app }) => (method, path, ...middlewares) => app[method.toLowerCase()](path, ...middlewares))
        .addClass(MyFirstExpressAdapter)
        .addFactoryFunction('start', ({ app, port }) => () => {
          return new Promise((resolve) => {
            const server = app.listen(port, () => {
              assertServerStarted(port);
              resolve(server);
            });
          });
        }));

    const myApp = execute(myAppPlan);
    const server = await myApp.start();
    expect(assertServerStarted).toHaveBeenCalledWith(3457);

    const answer = await fetch('http://localhost:3457/api/test').then((res) => res.json());
    expect(answer.secret).toStrictEqual('I love you');

    server.close();
  });
});
