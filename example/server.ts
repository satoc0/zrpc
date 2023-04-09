import { Server } from 'http';
import { api } from './index';
import { SchemaDefToType, ZServer } from '../src';
import { ProcedureHandlerFunction } from '../src/server/server-api-constructor';

(async () => {
  const server = new ZServer(api);

  server.api.account.get.use(({ req, res }) => {
    console.log(req.url);
  })((params) => {
    const { name } = params.input;
    return { data: name };
  });

  server.api.account.get.use(({ req, res }) => {
    console.log(req.url);
  })((params) => {
    const { name } = params.input;
    return { data: name };
  });

  const httpServer = new Server(server.entry);
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
