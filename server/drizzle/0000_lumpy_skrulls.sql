CREATE TABLE "game_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"player_name" varchar(30) NOT NULL,
	"avatar" varchar(10) NOT NULL,
	"color" varchar(7) NOT NULL,
	"was_impostor" boolean DEFAULT false NOT NULL,
	"was_eliminated" boolean DEFAULT false NOT NULL,
	"eliminated_round" integer,
	"final_clues" text[],
	"voted_correctly" boolean
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(4) NOT NULL,
	"mode" varchar(10) NOT NULL,
	"host_id" uuid NOT NULL,
	"secret_word" varchar(100),
	"impostor_id" uuid,
	"settings" jsonb NOT NULL,
	"winning_team" varchar(20),
	"rounds_played" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(30),
	"avatar" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_host_id_players_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_impostor_id_players_id_fk" FOREIGN KEY ("impostor_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_players_game_id_player_id_idx" ON "game_players" USING btree ("game_id","player_id");