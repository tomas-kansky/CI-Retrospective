CREATE TABLE `action_items` (
	`id` text PRIMARY KEY NOT NULL,
	`retrospective_id` text NOT NULL,
	`text` text NOT NULL,
	`assignee` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`due_date` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`retrospective_id`) REFERENCES `retrospectives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`column_id` text NOT NULL,
	`parent_card_id` text,
	`author_session_id` text NOT NULL,
	`author_name` text NOT NULL,
	`content` text NOT NULL,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`column_id`) REFERENCES `columns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `columns` (
	`id` text PRIMARY KEY NOT NULL,
	`retrospective_id` text NOT NULL,
	`title` text NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`retrospective_id`) REFERENCES `retrospectives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `retrospectives` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`phase` text DEFAULT 'BRAINSTORMING' NOT NULL,
	`template_type` text DEFAULT 'WENT_WELL_TO_IMPROVE' NOT NULL,
	`max_votes_per_user` integer DEFAULT 5 NOT NULL,
	`cards_blurred` integer DEFAULT true NOT NULL,
	`timer_ends_at` integer,
	`timer_duration_secs` integer DEFAULT 300 NOT NULL,
	`access_code` text,
	`created_at` text NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`user_session_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
