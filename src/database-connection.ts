import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {v4 as uuidv4} from 'uuid';
import {ClientConfig} from './client-config';
import {TicktackInfo} from './ticktack-info';
import {DummyDatabase} from './dummy-database';

export class DatabaseConnection {
  db: DummyDatabase;

  constructor(
    path: string,
    private config: ClientConfig,
  ) {
    this.db = new DummyDatabase(path);
    this.initMigration();
  }

  initMigration() {
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS migrations
        (
        filename VARCHAR(255),
        status INTEGER NULLABLE
        )`);

    this.db.all(
      'SELECT filename FROM migrations',
      (err, rows: {filename: string}[]) => {
        if (err) {
          return;
        }
        const migratedFiles = rows.map(row => row.filename);
        const migrationDir = join(__dirname, 'migrations');
        const dirContents = readdirSync(migrationDir);
        for (const filename of dirContents) {
          if (migratedFiles.includes(filename)) {
            continue;
          }
          const fullPath = join(migrationDir, filename);
          const content = readFileSync(fullPath).toString();
          this.db.exec(content);
          this.db.run('INSERT INTO migrations(filename) VALUES (?)', filename);
        }
      },
    );
  }

  insertMatch(matchId: string) {
    const row = this.db.get('SELECT id FROM matches WHERE id = ?', matchId);
    console.log('row', row);
    if (!row) {
      this.db.run('INSERT INTO matches (id) VALUES (?)', matchId);
    }
  }

  insertTicktackLog(payload: TicktackInfo) {
    this.db.run(
      `
      INSERT INTO ticktack_logs (id, match_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `,
      uuidv4(),
      this.config.matchId,
      JSON.stringify(payload),
      Date.now(),
      Date.now(),
    );
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
