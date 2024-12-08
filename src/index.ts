import {createInterface} from 'readline';
import {io} from 'socket.io-client';
import {ClientConfig} from './client-config';
import {ClientConnection} from './client-connection';
import {DatabaseConnection} from './database-connection';
import {PlayerBag} from './player-bag';

const config: ClientConfig = {};
config.profile = process.argv[2] ?? 'profile1';
const socket = io('http://localhost:81');
const db = new DatabaseConnection('./sig.db', config);
const bag = new PlayerBag(db);
const client = new ClientConnection(config, socket, bag, db);
client.init();

(async () => {
  while (true) {
    console.log('Enter request: (connect, run, q)');
    for await (const command of createInterface({input: process.stdin})) {
      switch (command) {
        case 'game id':
          let gameId = null;
          console.log('Enter game id:');
          for await (const command of createInterface({input: process.stdin})) {
            gameId = command;
            break;
          }
          if (gameId) {
            client.updateGameId(gameId);
          }
          break;
        case 'player id':
          let playerId = null;
          console.log('Enter player id:');
          for await (const command of createInterface({input: process.stdin})) {
            playerId = command;
            break;
          }
          if (playerId) {
            client.updatePlayerId(playerId);
          }
          break;
        case 'm':
          let path = null;
          console.log('Enter path:');
          for await (const command of createInterface({input: process.stdin})) {
            path = command;
            break;
          }
          if (path) {
            client.drivePlayer(path);
          }
          break;
        case 'change':
          client.switchWeapon();
          break;
        case 'use weapon':
          client.useWeapon();
          break;
        case 'c':
          client.joinGame();
          break;
        case 's':
          client.toggleAutorun();
          break;
        case 'g':
          let row: number = 0;
          let col: number = 0;
          console.log('Enter row:');
          for await (const input of createInterface({input: process.stdin})) {
            row = Number(input);
            break;
          }
          console.log('Enter col:');
          for await (const input of createInterface({input: process.stdin})) {
            col = Number(input);
            break;
          }
          client.goToPosition(row, col);
          break;
        case 'q':
          db.close();
          process.exit();
        default:
          console.log(command);
      }
      break;
    }
  }
})();
