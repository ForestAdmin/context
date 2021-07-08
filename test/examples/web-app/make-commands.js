module.exports = (context) => context
  .addValue('serverHandle', {}, { private: true })
  .addUsingFunction('startHTTP', ({
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
  .addUsingFunction('stopHTTP', ({ assertPresent, serverHandle }) => {
    assertPresent({ serverHandle });
    return () => serverHandle.get().close();
  })
  .addUsingFunction('getHTTPPort', ({ assertPresent, serverHandle }) => {
    assertPresent({ serverHandle });
    return () => serverHandle.getPort();
  });
