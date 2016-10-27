ALTER TABLE game_user_id RENAME user_id  TO "user";
ALTER TABLE game_user_id
  RENAME TO game_user;
ALTER TABLE game_user
  DROP CONSTRAINT game_user_id_pkey;
ALTER TABLE game_user
  ADD PRIMARY KEY (room, "user");
