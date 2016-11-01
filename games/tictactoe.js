"use strict";
var gd = require("easy-gd");
var bot;

function TicTacToe(room, players, data) {
    this.type = TicTacToe.type;
    this.room = room;
    this.data = data || {
        field: [
            "", "", "",
            "", "", "",
            "", "", ""
        ],
        turn: Math.floor(Math.random()*2) == 1 ? "X" : "O"
    }
    this.players = players || [];
    this.finished = false;
}

TicTacToe.prototype.addUsers = function(users) {
    var rand = Math.floor(Math.random()*2) == 1;
    this.players = [
        {
            user: users[0],
            data: rand ? "X" : "O"
        }, {
            user: users[1],
            data: rand ? "O" : "X"
        }
    ]
}

TicTacToe.prototype.introduce = function() {
    if (!this.players) return;
    var self = this;
    var p1 = this.players[0];
    var p2 = this.players[1];
    var beginner = p1.data == this.data.turn ? p1 : p2;
    
    // Some blabla to introduce the competitors :D
    var text = "Hey,\nwelcome to an exciting tictactoe match " +
        "between " + p1.user + " (" + p1.data + ") and " +
        p2.user + " (" + p2.data + ").\n" +
        "123\n456\n789\nThe fields are numbered 1-9, just type the according number.\n\n" +
        beginner.user + " (" + beginner.data + ") will begin!\n\n";
    
    bot.client.sendTextMessage(this.room, text).then(function() {
        self._sendField(function(){});
    });
}

TicTacToe.prototype.onText = function(player, event, callback) {
    var self = this;
    var text = event.getContent().body;
    if (this.data.turn == player.data) {
        var match = text.match(/^[1-9]/);
        if (match) {
            var num = parseInt(match[0]) - 1;
            if (this.data.field[num] == '') {
                this.data.field[num] = player.data;
                this.data.turn = this.data.turn == "X" ? "O" : "X";
                
                this._sendField(function() {
                    var winner = self._getWinner();
                    if (winner !== false) {
                        self.finished = true;
                        if (winner != null) {
                            var winner = self.players[0].data == winner ? self.players[0] : self.players[1];
                            var text = winner.user + " wins this game! Congratulations!";
                            bot.client.sendTextMessage(event.getRoomId(), text);
                        } else {
                            var text = "Oh, no! It's a draw!";
                            bot.client.sendTextMessage(event.getRoomId(), text);
                        }
                        callback(false);
                        return;
                    }
                    callback(true);
                    return;
                    
                });
            }
        }
    }
    callback(false);
    return;
}

TicTacToe.prototype._sendField = function(callback) {
    var self = this;
    this._generateImage(function(buffer) {
        bot.client.uploadContent(buffer, {
            name: "tictactoe",
            type: "image/png",
            rawResponse: false
        }).then(function(response) {
            bot.client.sendImageMessage(self.room, response.content_uri, {
                "mimetype": "image/png",
                "h": 94,
                "w": 94,
                "size": buffer.length
            }, self._shortField(), function() {
                callback();
            });
        });
    });
}

TicTacToe.prototype._generateImage = function(callback) {
    var self = this;
    gd.create(94, 94, function(err, image) {
        var black = image.colorAllocate(0, 0, 0);
        var white = image.colorAllocate(255, 255, 255);
        image.fill(0, 0, white);
        image.setThickness(2);
        image.line(31, 0, 31, 94, black);
        image.line(63, 0, 63, 94, black);
        image.line(0, 31, 94, 31, black);
        image.line(0, 63, 94, 63, black);
        
        for (var num = 0; num <= 8; num++) {
            var symbol = self.data.field[num];
            if (symbol == "X") {
                drawX(num, image, black);
            } else if(symbol == "O") {
                drawO(num, image, black);
            }
        }
        
        callback(image.save({format: 'png', compression: 9}));
        
        image.destroy();
    });
    
    function drawO(num, image, color) {
        var x = num % 3;
        var y = Math.floor(num / 3);
        x = x * 32 + 14;
        y = y * 32 + 14;
        image.ellipse(x, y, 26, 26, color);
    }
    
    function drawX(num, image, color) {
        var x = num % 3;
        var y = Math.floor(num / 3);
        var x1 = x * 32 + 2;
        var y1 = y * 32 + 2;
        var x2 = x * 32 + 28;
        var y2 = y * 32 + 28;
        image.setThickness(2);
        image.line(x1, y1, x2, y2, color);
        image.line(x1, y2, x2, y1, color);
    }
}

TicTacToe.prototype._shortField = function() {
    var message = "";
    message += this.data.field[0] || "_";
    message += this.data.field[1] || "_";
    message += this.data.field[2] || "_";
    message += "|";
    message += this.data.field[3] || "_";
    message += this.data.field[4] || "_";
    message += this.data.field[5] || "_";
    message += "|";
    message += this.data.field[6] || "_";
    message += this.data.field[7] || "_";
    message += this.data.field[8] || "_";
    return message;
}

TicTacToe.prototype._printField = function() {
    var message = "";
    message += this.data.field[0] || "  ";
    message += "|";
    message += this.data.field[1] || "  ";
    message += "|";
    message += this.data.field[2] || "  ";
    message += "\n---------\n";
    message += this.data.field[3] || "  ";
    message += "|";
    message += this.data.field[4] || "  ";
    message += "|";
    message += this.data.field[5] || "  ";
    message += "\n---------\n";
    message += this.data.field[6] || "  ";
    message += "|";
    message += this.data.field[7] || "  ";
    message += "|";
    message += this.data.field[8] || "  ";
    return message;
}

TicTacToe.prototype._getWinner = function() {
    var f = this.data.field;
    // horizontal
    if (f[0] == f[1] && f[1] == f[2] && f[2] != "") {
        return f[0];
    }
    if (f[3] == f[4] && f[4] == f[5] && f[5] != "") {
        return f[3];
    }
    if (f[6] == f[7] && f[7] == f[8] && f[8] != "") {
        return f[6];
    }
    // vertical
    if (f[0] == f[3] && f[3] == f[6] && f[6] != "") {
        return f[0];
    }
    if (f[1] == f[4] && f[4] == f[7] && f[7] != "") {
        return f[1];
    }
    if (f[2] == f[5] && f[5] == f[8] && f[8] != "") {
        return f[2];
    }
    // diagonal
    if (f[0] == f[4] && f[4] == f[8] && f[8] != "") {
        return f[0];
    }
    if (f[2] == f[4] && f[4] == f[6] && f[6] != "") {
        return f[2];
    }
    // draw
    if (f[0] != "" && f[1] != "" && f[2] != "" &&
        f[3] != "" && f[4] != "" && f[5] != "" &&
        f[6] != "" && f[7] != "" && f[8] != "") {
        return null;
    }
    return false;
}

TicTacToe.type = "tictactoe";

module.exports.setup = function(_bot) {
    bot = _bot;
    return TicTacToe;
}
