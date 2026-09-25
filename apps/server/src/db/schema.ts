import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const retrospectives = sqliteTable("retrospectives", {

  id: text("id").primaryKey(),
  title: text("title").notNull(),
  phase: text("phase").notNull().default("BRAINSTORMING"),
  templateType: text("template_type").notNull().default("WENT_WELL_TO_IMPROVE"),
  maxVotesPerUser: integer("max_votes_per_user").notNull().default(5),
  cardsBlurred: integer("cards_blurred", { mode: "boolean" }).notNull().default(true),
  timerEndsAt: integer("timer_ends_at"),
  timerDurationSecs: integer("timer_duration_secs").notNull().default(300),
  accessCode: text("access_code"),
  createdAt: text("created_at").notNull(),
  closedAt: text("closed_at"),
});

export const columns = sqliteTable("columns", {
  id: text("id").primaryKey(),
  retrospectiveId: text("retrospective_id")
    .notNull()
    .references(() => retrospectives.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  color: text("color").notNull().default("#6366f1"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  columnId: text("column_id")
    .notNull()
    .references(() => columns.id, { onDelete: "cascade" }),
  parentCardId: text("parent_card_id"),
  authorSessionId: text("author_session_id").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  userSessionId: text("user_session_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const actionItems = sqliteTable("action_items", {
  id: text("id").primaryKey(),
  retrospectiveId: text("retrospective_id")
    .notNull()
    .references(() => retrospectives.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  assignee: text("assignee"),
  status: text("status").notNull().default("OPEN"),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
});

export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default("bug"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  description: text("description").notNull(),
  stepsToReproduce: text("steps_to_reproduce"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  authorName: text("author_name").notNull(),
  authorSessionId: text("author_session_id").notNull(),
  roomId: text("room_id"),
  phase: text("phase"),
  userAgent: text("user_agent"),
  screenResolution: text("screen_resolution"),
  consoleErrors: text("console_errors"),
  githubCommitUrl: text("github_commit_url"),
  filePath: text("file_path"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export type TicketRecord = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

export type RetrospectiveRecord = typeof retrospectives.$inferSelect;
export type InsertRetrospective = typeof retrospectives.$inferInsert;

export type ColumnRecord = typeof columns.$inferSelect;
export type InsertColumn = typeof columns.$inferInsert;

export type CardRecord = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;

export type VoteRecord = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

export type ActionItemRecord = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;

export const retrospectivesRelations = relations(retrospectives, ({ many }) => ({
  columns: many(columns),
  actionItems: many(actionItems),
}));

export const columnsRelations = relations(columns, ({ one, many }) => ({
  retrospective: one(retrospectives, {
    fields: [columns.retrospectiveId],
    references: [retrospectives.id],
  }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  column: one(columns, {
    fields: [cards.columnId],
    references: [columns.id],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  card: one(cards, {
    fields: [votes.cardId],
    references: [cards.id],
  }),
}));

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
  retrospective: one(retrospectives, {
    fields: [actionItems.retrospectiveId],
    references: [retrospectives.id],
  }),
}));

