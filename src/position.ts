import {MapCellType, Position} from './ticktack-info';

export enum Direction {
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
  DOWN = 4,
}

export class TreeNode {
  direction?: Direction;
  constructor(
    public p: Position,
    private parent?: TreeNode,
    public v?: MapCellType,
  ) {
    if (parent) {
      this.direction = calculateDirection(p, parent.p);
    }
  }

  static tracePath(node: TreeNode): DirectionPath {
    const path: DirectionPath = new DirectionPath();
    let n = node;
    while (n.parent && n.direction) {
      path.directions.unshift(n.direction);
      path.positions.unshift(n.p);
      path.nodes.unshift(n);
      n = n.parent;
    }

    return path;
  }
}

export class DirectionPath {
  directions: Direction[] = [];
  positions: Position[] = [];
  nodes: TreeNode[] = [];
}

export function calculateDirection(
  p1: Position,
  p2: Position,
): Direction | undefined {
  if (p1.row === p2.row && p1.col + 1 === p2.col) {
    return Direction.LEFT;
  }
  if (p1.row === p2.row && p1.col - 1 === p2.col) {
    return Direction.RIGHT;
  }
  if (p1.row + 1 === p2.row && p1.col === p2.col) {
    return Direction.UP;
  }
  if (p1.row - 1 === p2.row && p1.col === p2.col) {
    return Direction.DOWN;
  }

  return undefined;
}

export function inPosArray(arr: Position[], p: Position): boolean {
  for (const position of arr) {
    if (position.row === p.row && position.col === p.col) {
      return true;
    }
  }

  return false;
}

export function samePosition(p1: Position, p2: Position): boolean {
  return p1.row === p2.row && p1.col === p2.col;
}
