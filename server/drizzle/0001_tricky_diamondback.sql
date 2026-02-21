CREATE INDEX "game_players_player_id_idx" ON "game_players" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "games_ended_at_idx" ON "games" USING btree ("ended_at");