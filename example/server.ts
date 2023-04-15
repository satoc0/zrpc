import { createServer } from 'http';
import { ZHttpServer } from '../src';
import { api } from './index';

(async () => {
  const server = new ZHttpServer(api);

  server.handle.account.get((ctx) => {
    return { data: ctx.input.name };
  });

  const httpServer = createServer();
  const serverPort = 3000;

  server.attach(httpServer);

  httpServer.listen(serverPort, async () => {
    console.log('@@@@@@@@@@@@@ listening on ' + serverPort);
  });
  function exitHandler() {
    httpServer.close();
  }

  //do something when app is closing
  process.on('exit', exitHandler);

  //catches ctrl+c event
  process.on('SIGINT', exitHandler);

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler);
  process.on('SIGUSR2', exitHandler);

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler);
  process.on('exit', () => {
    httpServer.close();
  });
})();
