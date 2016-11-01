"use strict";
var Storage = require("./storage.js");
var fs = require("fs");
var shell_parse = require("shell-quote").parse;

var REGEXP_USER_ID = /@[^ ]+:[^ ]+\.[a-z0-9_-]+/gi;
var GAME_DIR = "games";
var COMMAND_PREFIX = "!game";

function Bot(client, config, callback) {
    var self = this;
    this.client = client;
    this.config = config;
    this.user_id = this.config.get("auth", "user").toLowerCase();
    this.callback = callback;
    this.storage = new Storage(this.config, function() {
        self.loadGames(function(games) {
            self.games = games;
            self._registerEvents();
            self.callback();
        });
    });
}

Bot.prototype.loadGames = function(callback) {
    var self = this;
    fs.readdir(GAME_DIR, function(err, files) {
        var games = {};
        files.forEach(function(file, idx) {
            var Game = require("../" + GAME_DIR + "/" + file).setup(self);
            games[Game.type] = Game;
        });
        callback(games);
    });
}

Bot.prototype._registerEvents = function() {
    var self = this;
    this.client.on("sync", function(state, prevState, data) {
        switch (state) {
            case "PREPARED":
                // only listen for messages after initial sync
                self.client.on("Room.timeline", function(event, room, toStartOfTimeline, removed, data) {
                    self.onEvent(event);
                });
                break;
        }
    });
}

Bot.prototype.onEvent = function(event) {
    if (!event.getContent() || event.getSender() == this.user_id) {
        // ignore local echo
        return;
    }
    
    if (event.getType() == "m.room.member" && event.getContent().membership == "invite") {
        // auto-join rooms, when invited
        this.client.joinRoom(event.getRoomId());
    }
    
    if (event.getType() == "m.room.message" && event.getContent().msgtype == "m.text") {
        this._onMessage(event);
    }
    
    return;
}

Bot.prototype._onMessage = function(event) {
    var self = this;
    var text = event.getContent().body;
    var text_lower = text.toLowerCase();
    
    var commands = null;
    if (text.substr(0, COMMAND_PREFIX.length) == COMMAND_PREFIX) {
        commands = shell_parse(text);
        commands.shift(); // remove COMMAND_PREFIX
    }
    
    if (commands !== null) {
        if (commands.length == 0) {
            commands.push("help");
        }
        if (commands[0] == "help") {
            this.client.sendTextMessage(event.getRoomId(), event.getSender() +
                ": Avaiable commands:\n* help\n* leave\n* join <room>");
            return;
        } else if (commands[0] == "leave") {
            this.client.leave(event.getRoomId());
            return;
        } else if (commands[0] == "join") {
            if (commands.length >= 2) {
                this.client.joinRoom(commands[1]);
            } else {
                this.client.sendTextMessage(event.getRoomId(), event.getSender() + ": join <room>");
            }
            return;
        }
    }
    
    if (text_lower.indexOf(this.user_id) > -1) {
        this._onInvitation(event);
    } else {
        this.storage.isGameRoom(event.getRoomId(), function(result) {
            if (result) {
                self._onText(event, commands);
            }
        });
    }
}

Bot.prototype._onInvitation = function(event) {
    var self = this;
    var text = event.getContent().body;
    var text_lower = text.toLowerCase();
    
    var Game;
    for (var type in this.games) {
        if (text_lower.indexOf(type.toLowerCase()) > -1) {
            Game = this.games[type];
            break;
        }
    }
    if (!Game) {
        this.client.sendTextMessage(event.getRoomId(),
            "I don't know this game. Please choose one of '" + Object.keys(this.games).join("', '") + "'");
    } else {
        var matches = text_lower.match(REGEXP_USER_ID);
        var users = [event.getSender()];
        for (var i in matches) {
            var uid = matches[i];
            if (uid == this.user_id || uid == event.getSender()) {
                continue;
            }
            users.push(uid);
        }
        this.client.createRoom({
            visibility: "private",
            invite: users
        }).then(function(response) {
            var room = response.room_id;
            
            var game = new Game(room);
            game.addUsers(users);
            game.introduce();
            
            self.storage.createGame(game, function(result) {});
        }, console.log);
    }
}

Bot.prototype._onText = function(event, commands) {
    var self = this;
    var text = event.getContent().body;
    this.storage.getGame(event.getRoomId(), this.games, function(game) {
        var player = null;
        for (var i in game.players) {
            if (game.players[i].user == event.getSender()) {
                player = game.players[i];
                break;
            }
        }
        if (player) {
            game.onText(player, event, function(save) {
                if (save) {
                    self.storage.saveGame(game, function(){});
                }
                if (game.finished) {
                    self.storage.deleteGame(game, function(){});
                }
            });
        }
    });
}

module.exports = Bot;
