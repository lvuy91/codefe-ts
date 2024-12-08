import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { ClientConfig } from './client-config';
import { PlayerBag } from './player-bag';
import { MapArr, Position, TicktackInfo, Spoil } from './ticktack-info';
import { DatabaseConnection } from './database-connection';
import { MapScanner } from './map-scanner';

export class ClientConnection {
  private ticktack?: TicktackInfo;
  constructor(
    public config: ClientConfig,
    public socket: Socket,
    public bag: PlayerBag,
    public db: DatabaseConnection,
  ) { }

  init() {
    this.socket.on('join game', payload => {
      console.log(payload);
    });

    this.socket.on('ticktack player', (payload: TicktackInfo) => {
      if (this.config.profile === 'profile1') {
        this.bag.run(this, payload);
        this.ticktack = payload;
      }
    });

    this.socket.on('drive player', (payload: any) => {
      console.log('drive player', payload);
    });

    this.loadProfile();
    if (this.config.matchId) {
      this.db.insertMatch(this.config.matchId);
    }
    this.bag.consumeConfig(this.config);
  }

  loadProfile() {
    if (!this.config.profile) {
      return;
    }
    if (!existsSync('.profile')) {
      mkdirSync('.profile');
    }
    const profilePath = join('.profile', this.config.profile);
    if (existsSync(profilePath)) {
      const gameIdPath = join(profilePath, 'game-id.txt');
      if (existsSync(gameIdPath)) {
        const contents = readFileSync(gameIdPath);
        this.config.gameId = contents.toString();
      }
      const playerIdPath = join(profilePath, 'player-id.txt');
      if (existsSync(playerIdPath)) {
        const contents = readFileSync(playerIdPath);
        this.config.playerId = contents.toString();
      }
      console.log('Game id:', this.config.gameId);
      console.log('Player id:', this.config.playerId);
    } else {
      mkdirSync(profilePath);
    }

    this.ensureMatchId();
  }

  ensureMatchId() {
    if (this.config.profile) {
      const profilePath = join('.profile', this.config.profile);
      const matchIdPath = join(profilePath, 'match-id.txt');
      let matchId = uuidv4();
      if (existsSync(matchIdPath)) {
        const contents = readFileSync(matchIdPath);
        matchId = contents.toString().trim();
      } else {
        writeFileSync(matchIdPath, matchId);
      }
      this.config.matchId = matchId;
    }
  }

  updateGameId(gameId: string) {
    if (!this.config.profile) {
      return;
    }
    if (!existsSync('.profile')) {
      mkdirSync('.profile');
    }
    const profilePath = join('.profile', this.config.profile);
    if (!existsSync(profilePath)) {
      mkdirSync(profilePath);
    }
    writeFileSync(join(profilePath, 'game-id.txt'), gameId);
    this.config.gameId = gameId;
  }

  updatePlayerId(playerId: string) {
    if (!this.config.profile) {
      return;
    }
    if (!existsSync('.profile')) {
      mkdirSync('.profile');
    }
    const profilePath = join('.profile', this.config.profile);
    if (!existsSync(profilePath)) {
      mkdirSync(profilePath);
    }
    writeFileSync(join(profilePath, 'player-id.txt'), playerId);
    this.config.playerId = playerId;
  }

  getCurrentConfig() {
    return this.config;
  }

  newMatch() {
    if (!this.config.profile) {
      return;
    }
    if (!existsSync('.profile')) {
      mkdirSync('.profile');
    }
    const profilePath = join('.profile', this.config.profile);
    if (!existsSync(profilePath)) {
      mkdirSync(profilePath);
    }
    let matchId = uuidv4();
    writeFileSync(join(profilePath, 'match-id.txt'), matchId);
    this.config.matchId = matchId;
    this.db.insertMatch(matchId);
  }

  joinGame() {
    if (this.config.gameId && this.config.playerId) {
      this.socket.emit('join game', {
        game_id: this.config.gameId,
        player_id: this.config.playerId,
      });
    }
  }

  drivePlayer(path: string, child: boolean = false) {
    const params: any = {
      direction: path,
    };
    if (child) {
      params.characterType = 'child';
    }
    this.socket.emit('drive player', params);
  }

  toggleAutorun() {
    this.bag.toggleStop();
  }

  goToPosition(row: number, col: number) {
    if (this.ticktack) {
      const currentPlayer = this.ticktack.map_info.players.find(
        player => player.id === this.config.playerId,
      );
      if (currentPlayer?.currentPosition) {
        const scanner = new MapScanner(
          this.ticktack.map_info.map,
          currentPlayer?.currentPosition,
          this.ticktack.map_info.spoils,
          (map: MapArr, p: Position, spoils: Spoil[]) => {
            return p.row == row && p.col == col;
          },
        );
        const target = scanner.nextTarget();
        const path = target?.directions.join('');
        if (path) {
          this.drivePlayer(path);
        }
      }
    }
  }

  registerCharacterPower(type: CharacterType) {
    this.socket.emit('register character power', {
      gameId: this.config.gameId,
      type,
    });
  }

  actions(action: Action, payload: any = null, child: boolean = false) {
    const params: any = {
      action,
    };
    if (payload) {
      params.payload = payload;
    }
    if (child) {
      params.characterType = 'child';
    }
    this.socket.emit('action', params);
  }

  switchWeapon(child: boolean = false) {
    this.actions('switch weapon', null, child);
  }


  useWeapon(position?: Position, child: boolean = false) {
    const params: { destination?: Position } = {};
    if (position) {
      params.destination = position;
    }
    this.actions('use weapon', params, child);
  }

  marryWife() {
    this.actions('marry wife');
  }
}

type CharacterType = MountainGodType | SeaGodType;
type MountainGodType = 1;
type SeaGodType = 2;

type Action = 'switch weapon' | 'use weapon' | 'marry wife';
