# Gamebot

This bot can be invited to a [matrix](https://matrix.org) room and
will listen to users, which invite others to a game.

TODO more readme will follow

Note that this is very unstable atm.

Every game is persisted to a postgres database, so that complex games are not interupted by a bot restart.

## Setup

1. Clone Repo
2. Run `npm install`
3. Copy `config.ini.dist` to `config.ini` and edit settings
4. Run `node index.js`

## Usage

1. Join a matrix room of your choice.
2. Invite the user_id you set in `config.ini`
3. This bot should automatically join as soon as the invitation reaches the bot's HS via federation
4. Type something like `@gamebot:homeserver.tld: Invite @competitor:server.tld for tictactoe`
5. The bot will invite both players to a new room, which it creates

6. (You can "kick" the bot from a room by typing "!game leave".)

## Games

Currently only `tictactoe` is supported.

Take a look into the `games` folder for implementation details.

## License

MIT
