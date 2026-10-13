import Database from "better-sqlite3";

export class CheckpointStore {
  readonly #database: Database.Database;

  constructor(filename: string) {
    this.#database = new Database(filename);
    this.#database.pragma("journal_mode = WAL");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  save(id: string, state: unknown): void {
    this.#database.prepare(`
      INSERT INTO jobs(id, state, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at
    `).run(id, JSON.stringify(state), new Date().toISOString());
  }

  load<T>(id: string): T | undefined {
    const row = this.#database.prepare("SELECT state FROM jobs WHERE id = ?").get(id) as
      | { state: string }
      | undefined;
    return row ? JSON.parse(row.state) as T : undefined;
  }

  close(): void {
    this.#database.close();
  }
}
