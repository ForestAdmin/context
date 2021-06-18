module.exports = (context) => context
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
  });
