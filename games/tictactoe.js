"use strict";
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
        bot.client.sendTextMessage(self.room, self._printField());
    });
}

TicTacToe.prototype.onText = function(player, event) {
    var text = event.getContent().body;
    if (this.data.turn == player.data) {
        var match = text.match(/^[1-9]/);
        if (match) {
            var num = parseInt(match[0]) - 1;
            if (this.data.field[num] == '') {
                this.data.field[num] = player.data;
                this.data.turn = this.data.turn == "X" ? "O" : "X";
                bot.client.sendTextMessage(event.getRoomId(), this._printField());
                var winner = this._getWinner();
                if (winner !== false) {
                    this.finished = true;
                    if (winner != null) {
                        var winner = this.players[0].data == winner ? this.players[0] : this.players[1];
                        var text = winner.user + " wins this game! Congratulations!";
                        bot.client.sendTextMessage(event.getRoomId(), text);
                    } else {
                        var text = "Oh, no! It's a draw!";
                        bot.client.sendTextMessage(event.getRoomId(), text);
                    }
                    return false;
                }
                return true;
            }
        }
    }
    return false;
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
