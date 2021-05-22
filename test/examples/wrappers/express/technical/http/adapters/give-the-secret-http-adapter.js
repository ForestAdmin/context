module.exports = class GiveTheSecretHTTPAdapter {
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
};
