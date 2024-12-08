import {ClientConfig} from './client-config';
import {ClientConnection} from './client-connection';
import {DatabaseConnection} from './database-connection';
import {PaceMeasurement} from './pace-measurement';
import {PlayerAction} from './player-action';
import {TicktackInfo} from './ticktack-info';

export class PlayerBag {
  private players: Record<string, PlayerAction> = {};
  private activeIds: string[] = [];
  private config?: ClientConfig;
  private halt: boolean = false;

  constructor(private db: DatabaseConnection) {}

  run(client: ClientConnection, payload: TicktackInfo) {
    this.activeIds = [];
    const players = payload.map_info.players;
    for (const player of players) {
      if (player.id !== this.config?.playerId) {
        continue;
      }
      this.activeIds.push(player.id);
      if (!this.players[player.id]) {
        const paceMeasurement = new PaceMeasurement();
        this.players[player.id] = new PlayerAction(
          player,
          payload,
          client,
          paceMeasurement,
        );
      } else {
        this.players[player.id].info = player;
      }
    }
    this.db.insertTicktackLog(payload);
    for (const playerId of this.activeIds) {
      if (this.halt) {
        continue;
      }
      this.players[playerId].consumeTicktack(payload);
      this.players[playerId].nextAction();
    }
  }

  consumeConfig(config: ClientConfig) {
    this.config = config;
  }

  toggleStop() {
    this.halt = !this.halt;
  }
}
