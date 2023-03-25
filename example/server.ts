import { Server } from 'http';
import { api } from './index';
import { ZServer } from '../src';

(async () => {
  const server = new ZServer(api);

  server.handle('GetAccountCommand', async (_data) => {
    console.log({ _data, d: _data.name });

    return { name: '2' };
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

// regras
// apenas esses caracteres para chaves: qwertyuiopasdfghjklzxcvbnm
//
// tipos base: 1 = chave:valor, 2 = subdata, 3 = repeated
// { name: 'string', name2: 'string2' }
// arr
// byte_nextSectorAddress = endereço do próximo setor
// byte_type = Tipo do dado: 1 = chave:valor, 2 = subdata, 3 = repeated
// byte_fieldNameBytesLength = tamanho do nome do campo
// byte_fieldNameDataBytes = tamanho do nome do campo
// bytes_valuesDataBytes = bytes do valor
// [
//  setor
//  byte_nextSectorAddress, byte_type, byte_fieldNameBytesLength, ...byte_fieldNameDataBytes, ...bytes_valuesDataBytes,
//  setor
//  byte_nextSectorAddress, byte_type, byte_fieldNameBytesLength, ...byte_fieldNameDataBytes, ...bytes_valuesDataBytes,
//]
// decode linear ou split dos setores identificados e secode em paralelo?
// []
