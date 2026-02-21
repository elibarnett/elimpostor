CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_code" varchar(4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"total_rounds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"player_name" varchar(30) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"rounds_won" integer DEFAULT 0 NOT NULL,
	"rounds_played" integer DEFAULT 0 NOT NULL,
	"impostor_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_scores" ADD CONSTRAINT "session_scores_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_scores" ADD CONSTRAINT "session_scores_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_scores_session_player_idx" ON "session_scores" USING btree ("session_id","player_id");
