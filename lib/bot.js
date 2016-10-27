"use strict";
var Storage = require("./storage.js");
var fs = require("fs");

var REGEXP_USER_ID = /@[^ ]+:[^ ]+\.[a-z0-9_-]+/gi;
var GAME_DIR = "games";

function Bot(bridge, config, callback) {
    var self = this;
    this.bridge = bridge;
    this.config = config;
    this.user_id = this.config.get("matrix", "user_id").toLowerCase();
    this.callback = callback;
    this.storage = new Storage(this.config, function() {
        self.loadGames(function(games) {
            self.games = games;
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

Bot.prototype.onEvent = function(request, context) {
    //console.log("onEvent", request);
    var event = request.getData();
    if (!event.content || event.user_id == this.user_id) {
        // ignore local echo
        return;
    }
    
    if (event.type == "m.room.member" && event.content.membership == "invite") {
        // auto-join rooms, when invited
        this.bridge.getIntent().join(event.room_id);
    }
    
    if (event.type == "m.room.message" && event.content.msgtype == "m.text") {
        this._onMessage(event);
    }
    
    return;
}

Bot.prototype._onMessage = function(event) {
    var self = this;
    var text = event.content.body;
    var text_lower = text.toLowerCase();
    if (text_lower == "!leave") {
        this.bridge.getIntent().leave(event.room_id);
        return;
    } else if (text_lower.substr(0, 6) == "!join ") {
        this.bridge.getIntent().join(text.substr(6, text.length-6));
        return;
    }
    if (text_lower.indexOf(this.user_id) > -1) {
        this._onInvitation(event);
    } else {
        this.storage.isGameRoom(event.room_id, function(result) {
            if (result) {
                self._onText(event);
            }
        });
    }
}

Bot.prototype._onInvitation = function(event) {
    var self = this;
    var text = event.content.body;
    var text_lower = text.toLowerCase();
    
    var Game;
    for (var type in this.games) {
        if (text_lower.indexOf(type.toLowerCase()) > -1) {
            Game = this.games[type];
            break;
        }
    }
    if (!Game) {
        this.bridge.getIntent().sendText(event.room_id,
            "I don't know this game. Please choose one of '" + Object.keys(this.games).join("', '") + "'");
    } else {
        var matches = text_lower.match(REGEXP_USER_ID);
        var users = [event.user_id];
        for (var i in matches) {
            var uid = matches[i];
            if (uid == this.user_id || uid == event.user_id) {
                continue;
            }
            users.push(uid);
        }
        this.bridge.getIntent().createRoom({
            options: {
                visibility: "private",
                invite: users
            }
        }).then(function(response) {
            var room = response.room_id;
            
            var game = new Game(room);
            game.addUsers(users);
            game.introduce();
            
            self.storage.createGame(game, function(result) {});
        });
    }
}

Bot.prototype._onText = function(event) {
    var self = this;
    var text = event.content.body;
    //var text_lower = text.toLowerCase();
    this.storage.getGame(event.room_id, this.games, function(game) {
        var player = null;
        for (var i in game.players) {
            if (game.players[i].user == event.user_id) {
                player = game.players[i];
                break;
            }
        }
        if (player) {
            var save = game.onText(player, event);
            if (save) {
                self.storage.saveGame(game, function(){});
            }
            if (game.finished) {
                self.storage.deleteGame(game, function(){});
            }
        }
    });
}

module.exports = Bot;
