export class PaceMeasurement {
  justStart = false;
  private startTime = Date.now();
  private deltas: number[] = [];
  start() {
    this.justStart = true;
    this.startTime = Date.now();
  }

  check() {
    const delta = Date.now() - this.startTime;
    this.deltas.push(delta);
    this.justStart = false;
    return delta;
  }
}
