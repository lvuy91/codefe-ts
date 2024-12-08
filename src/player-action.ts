import { ClientConnection } from './client-connection';
import { MapScanner } from './map-scanner';
import { PaceMeasurement } from './pace-measurement';
import { samePosition } from './position';
import {
  MapArr,
  MapCellType,
  PlayerInfo,
  Position,
  TicktackInfo,
  Spoil
} from './ticktack-info';

export class PlayerAction {
  private expectedPositions: Position[] = [];
  private lastPosition?: Position;
  private lastPositionTime = Date.now();
  private lastStop?: number;
  private gameStart: boolean = false;
  private counting: number = 0;

  private takeBrickWall = false;
  private spoilItem = true;

  constructor(
    public info: PlayerInfo,
    private ticktack: TicktackInfo,
    private client: ClientConnection,
    private paceMeasurement: PaceMeasurement,
  ) { }

  consumeTicktack(payload: TicktackInfo) {
    this.ticktack = payload;
    if (this.expectedPositions.length) {
      const peek = this.expectedPositions[0];
      if (samePosition(peek, this.info.currentPosition)) {
        this.expectedPositions.shift();
        if (this.ticktack.tag !== 'player:start-moving') {
          if (this.paceMeasurement.justStart) {
            const lastPace = this.paceMeasurement.check();
            console.log(this.info.id, 'last pace', lastPace);
          }
          this.paceMeasurement.start();
        }
      }
    }

    if (
      !this.lastPosition ||
      !samePosition(this.lastPosition, this.info.currentPosition)
    ) {
      this.lastPosition = this.info.currentPosition;
      this.lastPositionTime = Date.now();
    }

    this.handleUnexpectedStop(() => {
      this.expectedPositions = [];
      this.lastPositionTime = Date.now();
      this.paceMeasurement.justStart = false;
    });

    // it wait too long
    if (this.lastPositionTime + 1000 < Date.now()) {
      this.expectedPositions = [];
      this.lastPositionTime = Date.now();
      this.paceMeasurement.justStart = false;
    }

    if (this.gameStart && !this.expectedPositions.length && !this.lastStop) {
      this.lastStop = Date.now();
    }
  }

  nextAction() {
    if (this.shouldWait()) {
      return;
    }
    this.gameStart = true;

    const nextAction = this.getNextAction();
    switch (nextAction) {
      case Actions.GoAround:
        const path = this.findNextTarget();
        if (path) {
          //client.drivePlayer(path.directions.map(d => d + 'b').join(''));
          this.client.drivePlayer(path.directions.join(''));
          this.expectedPositions = path.positions;
          if (path.nodes[path.nodes.length - 1].v === MapCellType.BrickWall) {
            this.takeBrickWall = true;
          }

          if (path.nodes[path.nodes.length - 1].v === MapCellType.Balk) {

            /*switchWeapon(child: boolean = false) {
    this.actions('switch weapon', null, child);
  }

  useWeapon(position?: Position, child: boolean = false) {
    const params: {destination?: Position} = {};
    if (position) {
      params.destination = position;
    }
    this.actions('use weapon', params, child);
  } */
            if (this.isSafe()) {
              var currentWeapon = this.currentWeapon();
              console.log('is safe' + currentWeapon);
              if (currentWeapon != 2) {
                this.client.switchWeapon(false);
              }
              this.client.actions('use weapon');
              console.log('is use weapon' + currentWeapon);
              this.client.drivePlayer('b');
            }
            // this.spoilItem = true;
          }
          this.lastStop = undefined;
        }
        break;
      case Actions.TakeBrickWall:
        this.client.drivePlayer('b');
        this.wait();
        break;
      case Actions.Wait:
        this.wait();
        break;
    }
  }

  getNextAction(): Actions {
    if (this.isSafe() && this.isAtGodBadge() && !this.isGod()) {
      return Actions.Wait;
    }
    if (this.takeBrickWall) {
      this.takeBrickWall = false;
      return Actions.TakeBrickWall;
    }

    if (this.spoilItem) {
      this.spoilItem = false;
      return Actions.Wait;
    }

    return Actions.GoAround;
  }

  findNextTarget() {
    if (!this.ticktack) {
      return;
    }
    const currentPos = this.info.currentPosition;
    const scanner = new MapScanner(
      this.ticktack.map_info.map,
      currentPos,
      this.ticktack.map_info.spoils,
      (map: MapArr, p: Position, s: Spoil[]) => {
        const getGodBadge =
          map[p.row][p.col] === MapCellType.GodBadge && !this.isGod();


        const getBrickWall = map[p.row][p.col] === MapCellType.BrickWall;
        const getBalk = this.isGod() && map[p.row][p.col] === MapCellType.Balk;
        const getStickyRice = this.isGod() && this.hasType(s, 32, p);
        const getChungCake = this.isGod() && this.hasType(s, 33, p);
        const getNineTuskElephant = this.isGod() && this.hasType(s, 34, p);
        const getNineSpurRooster = this.isGod() && this.hasType(s, 35, p);
        const getNineManeHairHorse = this.isGod() && this.hasType(s, 35, p);
        const getHolySpiritStone = this.isGod() && this.hasType(s, 35, p);
        return getGodBadge || getHolySpiritStone || getNineManeHairHorse || getNineSpurRooster ||
         getNineTuskElephant || getBalk || getChungCake || getStickyRice || getBrickWall;
      },
    );
    return scanner.nextTarget();
  }
  hasType(spoils: Spoil[], type: number, position: Position): boolean {
    return spoils.some(spoil => spoil.spoil_type === type && spoil.row === position.row && spoil.col === position.col);
  }

  wait() {
    this.lastStop = Date.now();
  }

  shouldWait(): boolean {
    if (this.expectedPositions.length || this.needToDelay()) {
      return true;
    }

    return false;
  }

  needToDelay(): boolean {
    // if (this.lastStop && this.lastStop + 4000 > Date.now()) {
    //   return true;
    // }

    return false;
  }

  handleUnexpectedStop(cb: () => void) {
    if (
      this.ticktack?.player_id === this.info.id &&
      this.ticktack?.tag === 'player:start-moving'
    ) {
      this.counting += 1;
    }
    if (
      this.ticktack?.player_id === this.info.id &&
      this.ticktack?.tag === 'player:stop-moving'
    ) {
      this.counting -= 1;
    }
    if (this.counting < 0) {
      console.log(this.info.id, 'encounter unexpected');
      this.counting = 0;
      cb();
    }
  }

  isSafe(): boolean {
    const currentUser = this.ticktack.map_info.players.find(p => p.id === this.client.getCurrentConfig().playerId);
    return !this.ticktack.map_info.bombs.some(b =>
      (b.col === currentUser?.currentPosition.col && (b.row <= currentUser.currentPosition.row + 2 || b.row >= currentUser.currentPosition.row - 2)) ||
      (b.row === currentUser?.currentPosition.row && (b.col <= currentUser.currentPosition.col + 2 || b.col >= currentUser.currentPosition.col - 2)));
  }

  currentWeapon() {

    const currentUser = this.ticktack.map_info.players.find(p => p.id === this.client.getCurrentConfig().playerId);
    return currentUser?.currentWeapon;
  }
  isAtGodBadge(): boolean {
    const currentPos = this.info.currentPosition;
    const map = this.ticktack?.map_info.map;
    if (
      map[currentPos.row][currentPos.col] === MapCellType.GodBadge
    ) {
      return true;
    }

    return false;
  }

  isGod() {
    return this.info.hasTransform;
  }
}

enum Actions {
  GoAround = 1,
  TakeBrickWall = 2,
  Wait = 3,
  Attack = 4,
}
