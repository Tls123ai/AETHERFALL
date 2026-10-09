/**
 * Embedded PostgreSQL launcher for local development.
 *
 * Boots a persistent Postgres cluster inside the sandbox (data dir: .pgdata),
 * creates the `aetherfall` database and applies the schema idempotently.
 * Keeps running until killed — the Next.js server connects via DATABASE_URL.
 *
 * Usage: node scripts/db.mjs
 */
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, ".pgdata");

const PORT = Number(process.env.PG_PORT ?? 5433);
const USER = process.env.PG_USER ?? "aetherfall";
const PASSWORD = process.env.PG_PASSWORD ?? "aetherfall";
const DB_NAME = process.env.PG_DB ?? "aetherfall";

mkdirSync(dataDir, { recursive: true });

const log = (...a) => console.log("[db]", ...a);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port: PORT,
  user: USER,
  password: PASSWORD,
  persistent: true,
  onLog: (m) => log(String(m).trim()),
  onError: (m) => log("ERROR:", String(m).trim()),
});

process.on("SIGINT", () => {
  log("shutting down…");
  pg.stop().catch(() => {});
  process.exit(0);
});
process.on("SIGTERM", () => {
  pg.stop().catch(() => {});
  process.exit(0);
});

try {
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    log("initialising cluster…");
    await pg.initialise();
  }
  await pg.start();
  log(`postgres listening on 127.0.0.1:${PORT}`);

  // make sure the database exists
  const admin = pg.getPgClient("postgres", "127.0.0.1");
  await admin.connect();
  const { rows } = await admin.query(
    "select 1 from pg_database where datname = $1",
    [DB_NAME]
  );
  if (rows.length === 0) {
    await pg.createDatabase(DB_NAME);
    log(`created database "${DB_NAME}"`);
  }
  await admin.end();

  // apply schema (idempotent)
  const client = pg.getPgClient(DB_NAME, "127.0.0.1");
  await client.connect();
  await client.query(`
    create table if not exists users (
      id serial primary key,
      username text not null unique,
      password_hash text not null,
      created_at timestamp not null default now()
    );

    create table if not exists sessions (
      token text primary key,
      user_id integer not null references users(id) on delete cascade,
      created_at timestamp not null default now()
    );
    create index if not exists sessions_by_user on sessions(user_id);

    create table if not exists saves (
      user_id integer not null references users(id) on delete cascade,
      class_id text not null,
      level integer not null default 1,
      xp integer not null default 0,
      gold integer not null default 0,
      resources integer not null default 0,
      unlocked_maps integer not null default 1,
      defeated_bosses jsonb not null default '[]',
      equipped_weapon text not null,
      owned_weapons jsonb not null default '[]',
      skill_levels jsonb not null default '{}',
      updated_at timestamp not null default now(),
      primary key (user_id, class_id)
    );

    create table if not exists user_progress (
      user_id integer primary key references users(id) on delete cascade,
      unlocked_classes jsonb not null default '["swordsman"]',
      perm_levels jsonb not null default '{}',
      updated_at timestamp not null default now()
    );
  `);
  await client.query("select 1");
  await client.end();
  log("schema ready");
  log(`DB READY  postgres://${USER}:***@127.0.0.1:${PORT}/${DB_NAME}`);
} catch (err) {
  console.error("[db] fatal:", err);
  process.exit(1);
}

// keep the process alive
await new Promise(() => {});
