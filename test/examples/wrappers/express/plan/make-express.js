const makeExpressMiddlewares = require('../technical/http/make-express-middlewares');

module.exports = (context) => context
  .addFactoryFunction('app', ({ assertPresent, express }) => {
    assertPresent({ express });
    return express();
  })
  .addFactoryFunction('addHTTPEndpoint', ({ app }) =>
    (method, path, ...callStack) =>
      app[method.toLowerCase()](path, ...makeExpressMiddlewares(callStack)));
