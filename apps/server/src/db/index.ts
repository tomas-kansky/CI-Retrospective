import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

let tablesInitialized = false;

export async function ensureTablesExist(d1: D1Database) {
  if (tablesInitialized) return;

  try {
    await d1.batch([
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS retrospectives (
          id text PRIMARY KEY NOT NULL,
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
          created_at text NOT NULL,
          FOREIGN KEY (card_id) REFERENCES cards(id) ON UPDATE no action ON DELETE cascade
        );
      `),
      d1.prepare(`
        CREATE TABLE IF NOT EXISTS action_items (
          id text PRIMARY KEY NOT NULL,
          retrospective_id text NOT NULL,
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
          github_commit_url text,
          file_path text,
          created_at text NOT NULL,
          resolved_at text
        );
      `),
    ]);
    tablesInitialized = true;
  } catch (err) {
    console.error("Auto table migration error:", err);
  }
}

export * from "./schema";
