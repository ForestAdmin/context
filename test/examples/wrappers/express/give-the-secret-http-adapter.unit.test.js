/* eslint-disable no-new */
const GiveTheSecretHTTPAdapter = require('./technical/http/adapters/give-the-secret-http-adapter');

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

      const { addHTTPEndpoint, ensureAuthenticated } = context;
      expect(addHTTPEndpoint).toHaveBeenCalledTimes(1);
      expect(addHTTPEndpoint).toHaveBeenCalledWith(
        'GET',
        '/api/give/secret',
        ensureAuthenticated,
        expect.anything(),
      );
    });
  });
});
