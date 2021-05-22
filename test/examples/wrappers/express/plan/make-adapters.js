const GiveTheSecretHTTPAdapter = require('../technical/http/adapters/give-the-secret-http-adapter');

module.exports = (context) => context
  .addUsingClass('expressAdapter', GiveTheSecretHTTPAdapter);
