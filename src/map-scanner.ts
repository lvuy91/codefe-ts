import {Direction, DirectionPath, inPosArray, TreeNode} from './position';
import {MapArr, MapCellType, Position, Spoil} from './ticktack-info';

export class MapScanner {
  constructor(
    private map: MapArr,
    private start: Position,
    private spoils: Spoil[],
    private filter: (map: MapArr, p: Position, spoils: Spoil[]) => boolean,
  ) {}

  nextTarget(): DirectionPath | null {
    const rootNode = new TreeNode(this.start);
    const queue: TreeNode[] = [rootNode];
    const visited: Position[] = [];
    const targets: TreeNode[] = [];

    while (queue.length) {
      const node = queue.shift();
      if (!node || inPosArray(visited, node.p)) {
        continue;
      }
      visited.push(node.p);

      const neighborPositions = this.getNeighbors(node.p);
      for (const neighbor of neighborPositions) {
        if (this.safeToReach(neighbor)) {
          const v = this.map[neighbor.row][neighbor.col];
          const neighborNode = new TreeNode(neighbor, node, v);
          if (this.canPassThrough(neighbor)) {
            queue.push(neighborNode);
          }
          if (this.filter(this.map, neighbor, this.spoils)) {
            targets.push(neighborNode);
          }
        }
      }
    }

    if (targets.length) {
      const selectedIndex = Math.floor(Math.random() * targets.length);
      const selected = targets[selectedIndex];
      if (selected) {
        return TreeNode.tracePath(selected);
      }
    }

    return null;
  }

  getNeighbors(p: Position): Position[] {
    const neighbors: Position[] = [];
    // Need check Random
    const directions = this.randomDirections();
    let np: Position;
    for (const d of directions) {
      const np: Position = this.getNeighbor(p, d);
      if (!this.inMap(np)) {
        continue;
      }
      neighbors.push(np);
    }
    return neighbors;
  }

  getNeighbor(p: Position, direction: Direction): Position {
    switch (direction) {
      case Direction.LEFT:
        return {
          row: p.row - 1,
          col: p.col,
        };
      case Direction.RIGHT:
        return {
          row: p.row + 1,
          col: p.col,
        };
      case Direction.UP:
        return {
          row: p.row,
          col: p.col - 1,
        };
      case Direction.DOWN:
        return {
          row: p.row,
          col: p.col + 1,
        };
    }
  }

  randomDirections(): Direction[] {
    const result: Direction[] = [];
    const first = Math.floor(Math.random() * 4) + 1;
    result.push(first);

    const second = Math.floor(Math.random() * 3) + 1;
    if (result.includes(second)) {
      result.push(second + 1);
    } else {
      result.push(second);
    }

    const third = Math.floor(Math.random() * 2) + 1;
    if (result.includes(third)) {
      result.push(third + 1);
    } else {
      result.push(third);
    }

    for (let i = 1; i <= 4; i++) {
      if (!result.includes(i)) {
        result.push(i);
        break;
      }
    }

    return result;
  }

  inMap(p: Position): boolean {
    if (!Array.isArray(this.map[p.row])) {
      return false;
    }
    if (this.map[p.row][p.col] === undefined) {
      return false;
    }

    return true;
  }

  safeToReach(p: Position): boolean {
    if (this.map[p.row][p.col] === MapCellType.EmptyCell) {
      return true;
    }
    if (this.map[p.row][p.col] === MapCellType.BrickWall) {
      return true;
    }
    if (this.map[p.row][p.col] === MapCellType.GodBadge) {
      return true;
    }
    if (this.map[p.row][p.col] === MapCellType.Balk) {
      return true;
    }
    if(this.spoils.some(x=>x.col === p.col && x.row === p.row )){
      return true;
    }
    return false;
  }

  canPassThrough(p: Position): boolean {
    if (this.map[p.row][p.col] === MapCellType.EmptyCell) {
      return true;
    }
    if (this.map[p.row][p.col] === MapCellType.GodBadge) {
      return true;
    }
    return false;
  }
}
