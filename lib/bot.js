"use strict";
var Storage = require("./storage.js");
var fs = require("fs");

var REGEXP_USER_ID = /@[^ ]+:[^ ]+\.[a-z0-9_-]+/gi;

function Bot(bridge, config, callback) {
    this.bridge = bridge;
    this.config = config;
    this.user_id = this.config.get("matrix", "user_id").toLowerCase();
    this.callback = callback;
    this.storage = new Storage(this.config, this.callback);
}

Bot.prototype.onEvent = function(request, context) {
    console.log("onEvent", request);
    var event = request.getData();
    if (!event.content || event.user_id == this.user_id) {
        return;
    }
    
    if (event.type == "m.room.member" && event.content.membership == "invite") {
        bridge.getIntent().join(event.room_id);
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
        var room_id = response.room_id;
        self.storage.createGame(room_id, "tictactoe", {field:["","","","","","","","",""],turn:"X"}, function(result) {
            self.storage.addPlayers(room_id, [
                    {
                        user: users[0],
                        data: "X"
                    }, {
                        user: users[1],
                        data: "O"
                    }
                ], function(result) {
                    
                });
        });
    });
}

Bot.prototype._onText = function(event) {
    var self = this;
    var text = event.content.body;
    //var text_lower = text.toLowerCase();
    this.storage.getGame(event.room_id, function(game) {
        var player = null;
        for (var i in game.players) {
            if (game.players[i].user == event.user_id) {
                player = game.players[i];
                break;
            }
        }
        if (player && game.data.turn == player.data) {
            var match = text.match(/^[1-9]/);
            if (match) {
                var num = parseInt(match[0]) - 1;
                if (game.data.field[num] == '') {
                    game.data.field[num] = player.data;
                    game.data.turn = game.data.turn == "X" ? "O" : "X";
                    
                    self.storage.saveGame(game, function(){});
                    
                    var message = "";
                    message += game.data.field[0] || "  ";
                    message += "|";
                    message += game.data.field[1] || "  ";
                    message += "|";
                    message += game.data.field[2] || "  ";
                    message += "\n---------\n";
                    message += game.data.field[3] || "  ";
                    message += "|";
                    message += game.data.field[4] || "  ";
                    message += "|";
                    message += game.data.field[5] || "  ";
                    message += "\n---------\n";
                    message += game.data.field[6] || "  ";
                    message += "|";
                    message += game.data.field[7] || "  ";
                    message += "|";
                    message += game.data.field[8] || "  ";
                    
                    self.bridge.getIntent().sendText(event.room_id, message);
                }
            }
        }
    });
}

module.exports = Bot;
