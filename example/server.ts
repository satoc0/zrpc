import { Server } from 'http';
import { ZServer } from '../src';
import { api } from './index';

(async () => {
  const server = new ZServer(api);

  server.handle.account.get.use((ctx) => {
    ctx.set('a', 'abc');

    // cliente atual
    ctx.client.account.update();

    // cliente que pode ta conectado a outra instância
    ctx.client('myid').chat.addMessage({});

    console.log({ ctx: ctx.input.name });
  })((ctx) => {
    return { data: ctx.get('a') + ctx.input.name };
  });

  const httpServer = new Server(server.http);
  const serverPort = 3000;

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
