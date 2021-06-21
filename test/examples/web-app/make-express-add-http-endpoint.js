const makeExpressMiddlewares = require('./make-express-middlewares');

module.exports = ({ app }) =>
  (method, path, ...callStack) =>
    app[method.toLowerCase()](path, ...makeExpressMiddlewares(callStack));
