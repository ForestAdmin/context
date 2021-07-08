const makeExpressMiddlewares = require('../technical/http/make-express-middlewares');

module.exports = (context) => context
  .addUsingFunction('app', ({ assertPresent, express }) => {
    assertPresent({ express });
    return express();
  })
  .addUsingFunction('addHTTPEndpoint', ({ app }) =>
    (method, path, ...callStack) =>
      app[method.toLowerCase()](path, ...makeExpressMiddlewares(callStack)));
