import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const DEFAULT_TEAM_ID = "client-interactions";

// Předpočítané PBKDF2-SHA256 hashe (60 000 iterací) pro výchozí seed přístupu
export const DEFAULT_ADMIN_PASSWORD_HASH =
  "pbkdf2_sha256$60000$b87678cbfe86fb7f7cf990b546e68efe$31da079e8882aab48949a165cf7602f65028bcd26005f71e2edd7148335e5e5c";
export const DEFAULT_CI_TEAM_PASSWORD_HASH =
  "pbkdf2_sha256$60000$6f5802a9ca278189fbda62e43d531354$ad5592f64fed42918a2b9ee08fc15f4d79906c0d3d2c781c00d9d2330bc2336b";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

let tablesInitialized = false;

export async function ensureTablesExist(d1: D1Database) {
  if (tablesInitialized) return;

  try {
    const now = new Date().toISOString();

    await d1.batch([
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key text PRIMARY KEY NOT NULL,
          value text NOT NULL,
          updated_at text NOT NULL
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS teams (
          id text PRIMARY KEY NOT NULL,
          slug text NOT NULL UNIQUE,
          name text NOT NULL,
          password_hash text NOT NULL,
          password_lookup text,
          created_at text NOT NULL
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS share_tokens (
          token text PRIMARY KEY NOT NULL,
          team_id text NOT NULL,
          room_id text,
          created_at text NOT NULL,
          expires_at integer NOT NULL,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON UPDATE no action ON DELETE cascade
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          key text PRIMARY KEY NOT NULL,
          failed_attempts integer DEFAULT 0 NOT NULL,
          locked_until integer,
          updated_at text NOT NULL
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS retrospectives (
          id text PRIMARY KEY NOT NULL,
          team_id text DEFAULT 'client-interactions' NOT NULL,
          title text NOT NULL,
          phase text DEFAULT 'BRAINSTORMING' NOT NULL,
          template_type text DEFAULT 'WENT_WELL_TO_IMPROVE' NOT NULL,
          max_votes_per_user integer DEFAULT 5 NOT NULL,
          cards_blurred integer DEFAULT 1 NOT NULL,
          timer_ends_at integer,
          timer_duration_secs integer DEFAULT 300 NOT NULL,
          access_code text,
          created_at text NOT NULL,
          closed_at text
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS columns (
          id text PRIMARY KEY NOT NULL,
          retrospective_id text NOT NULL,
          title text NOT NULL,
          color text DEFAULT '#6366f1' NOT NULL,
          sort_order integer DEFAULT 0 NOT NULL,
          FOREIGN KEY (retrospective_id) REFERENCES retrospectives(id) ON UPDATE no action ON DELETE cascade
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS cards (
          id text PRIMARY KEY NOT NULL,
          column_id text NOT NULL,
          parent_card_id text,
          author_session_id text NOT NULL,
          author_name text NOT NULL,
          content text NOT NULL,
          color text,
          sort_order integer DEFAULT 0 NOT NULL,
          created_at text NOT NULL,
          FOREIGN KEY (column_id) REFERENCES columns(id) ON UPDATE no action ON DELETE cascade
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS votes (
          id text PRIMARY KEY NOT NULL,
          card_id text NOT NULL,
          user_session_id text NOT NULL,
          vote_type text DEFAULT 'UP' NOT NULL,
          created_at text NOT NULL,
          FOREIGN KEY (card_id) REFERENCES cards(id) ON UPDATE no action ON DELETE cascade
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS action_items (
          id text PRIMARY KEY NOT NULL,
          retrospective_id text NOT NULL,
          team_id text DEFAULT 'client-interactions' NOT NULL,
          text text NOT NULL,
          assignee text,
          status text DEFAULT 'OPEN' NOT NULL,
          due_date text,
          created_at text NOT NULL,
          FOREIGN KEY (retrospective_id) REFERENCES retrospectives(id) ON UPDATE no action ON DELETE cascade
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS tickets (
          id text PRIMARY KEY NOT NULL,
          title text NOT NULL,
          type text DEFAULT 'bug' NOT NULL,
          status text DEFAULT 'open' NOT NULL,
          priority text DEFAULT 'medium' NOT NULL,
          description text NOT NULL,
          steps_to_reproduce text,
          expected_behavior text,
          actual_behavior text,
          author_name text NOT NULL,
          author_session_id text NOT NULL,
          room_id text,
          phase text,
          user_agent text,
          screen_resolution text,
          console_errors text,
          screenshot text,
          github_commit_url text,
          file_path text,
          created_at text NOT NULL,
          resolved_at text
        );
      `),
    ]);

    // Bezpečná migrace pro stávající tabulky
    try {
      await d1.prepare("ALTER TABLE votes ADD COLUMN vote_type text DEFAULT 'UP'").run();
    } catch {
      // Sloupec již existuje, ignorujeme
    }
    try {
      await d1.prepare("ALTER TABLE tickets ADD COLUMN screenshot text").run();
    } catch {
      // Sloupec již existuje, ignorujeme
    }
    try {
      await d1
        .prepare("ALTER TABLE retrospectives ADD COLUMN team_id text DEFAULT 'client-interactions' NOT NULL")
        .run();
    } catch {
      // Sloupec již existuje, ignorujeme
    }
    try {
      await d1
        .prepare("ALTER TABLE action_items ADD COLUMN team_id text DEFAULT 'client-interactions' NOT NULL")
        .run();
    } catch {
      // Sloupec již existuje, ignorujeme
    }

    // Seed výchozího týmu Client Interactions a výchozího hesla admina + doplnění team_id
    await d1.batch([
      d1
        .prepare(
          `INSERT OR IGNORE INTO teams (id, slug, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`
        )
        .bind(DEFAULT_TEAM_ID, "client-interactions", "Client Interactions", DEFAULT_CI_TEAM_PASSWORD_HASH, now),
      d1
        .prepare(`INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`)
        .bind("admin_password_hash", DEFAULT_ADMIN_PASSWORD_HASH, now),
      d1.prepare(
        `UPDATE retrospectives SET team_id = 'client-interactions' WHERE team_id IS NULL OR team_id = ''`
      ),
      d1.prepare(
        `UPDATE action_items SET team_id = 'client-interactions' WHERE team_id IS NULL OR team_id = ''`
      ),
    ]);

    tablesInitialized = true;
  } catch (err) {
    console.error("Auto table migration error:", err);
  }
}

export * from "./schema";
