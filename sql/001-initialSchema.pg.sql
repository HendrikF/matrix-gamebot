CREATE TABLE game
(
  room character varying NOT NULL,
  type character varying NOT NULL,
  data character varying,
  CONSTRAINT game_pkey PRIMARY KEY (room)
);
CREATE TABLE game_user_id
(
  room character varying NOT NULL,
  user_id character varying NOT NULL,
  data character varying,
  CONSTRAINT game_user_id_pkey PRIMARY KEY (room, user_id),
  CONSTRAINT game_user_id_room_fkey FOREIGN KEY (room)
      REFERENCES game (room) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
);
