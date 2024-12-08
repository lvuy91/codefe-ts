export class DummyDatabase {
  constructor(path: string) {}

  all(command: string, callback: (err: any, rows: any) => void) {}

  exec(command: string) {}

  run(command: string, ...params: any) {}

  get(command: string, ...params: any): any {}

  close() {}
}
