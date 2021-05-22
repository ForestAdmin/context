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

module.exports = (callStack) => {
  return callStack.map(makeExpressMiddleware);
};
