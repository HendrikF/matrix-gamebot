"use strict";
var pg = require("pg");
var SchemaManager = require("./schemamanager.js");
var fs = require("fs");

var SQL_DIR = "sql";

function Storage(config, callback) {
    var self = this;
    this.callback = callback;
    this.config = config;
    this.poolConfig = {
        user: this.config.get("database", "user"),
        database: this.config.get("database", "database"),
        password: this.config.get("database", "password"),
        port: this.config.getNumber("database", "port"),
        max: this.config.getNumber("database", "max_connections"),
        idleTimeoutMillis: this.config.getNumber("database", "idle_timeout"),
    }
    this.pool = new pg.Pool(this.poolConfig);
    this.pool.on('error', function (err, client) {
        console.error('idle db client error', err.message, err.stack)
    });
    this.schemamanager = new SchemaManager({
        prepareSchemaTable: function(callback) {
            self.connect(function(client, done) {
                // detect whether the table is present
                client.query("SELECT 1 AS num FROM schema", function(err, result) {
                    if (err) {
                        // create the table
                        client.query("CREATE TABLE schema (change_name character varying NOT NULL, CONSTRAINT schema_pkey PRIMARY KEY (change_name));", function(err, result) {
                            done();
                            if (err) { throw err; }
                            callback();
                        });
                    } else {
                        done();
                        callback();
                    }
                });
            });
        },
        getAvailableChanges: function(callback) {
            var files = fs.readdir(SQL_DIR, function(err, files) {
                files = files.sort();
                callback(files);
            });
        },
        getAppliedChanges: function(callback) {
            self.connect(function(client, done) {
                client.query("SELECT * FROM schema", function(err, result) {
                    done();
                    if (err) { throw err; }
                    var changes = [];
                    for (var i in result.rows) {
                        changes.push(result.rows[i].change_name);
                    }
                    callback(changes);
                });
            });
        },
        applyChange: function(change, callback) {
            fs.readFile(SQL_DIR + "/" + change, "utf8", function(err, data) {
                if (err) { throw err; }
                data = "BEGIN; " + data + "; INSERT INTO schema VALUES ('" + change + "'); COMMIT;";
                self.connect(function(client, done) {
                    client.query(data, function(err, result) {
                        done();
                        if (err) { throw err; }
                        callback();
                    });
                });
            });
        }
    });
    this.schemamanager.run(this.callback);
}

Storage.prototype.connect = function(callback) {
    this.pool.connect(function(err, client, done) {
        if(err) {
            return console.error("error fetching client from pool", err);
        }
        callback(client, done);
    });
}

Storage.prototype.createGame = function(game, callback) {
    this.connect(function(client, done) {
        client.query("INSERT INTO game (room, type, data) VALUES ($1, $2, $3)", [game.room, game.type, JSON.stringify(game.data)], function(err, result) {
            if (err) { throw err; }
            var idx = -1;
            function update() {
                idx++;
                if (idx >= game.players.length) {
                    done();
                    callback();
                    return;
                }
                var player = game.players[idx];
                client.query("INSERT INTO game_user (room, \"user\", data) VALUES ($1, $2, $3)", [game.room, player.user, JSON.stringify(player.data)], function(err, result) {
                    if (err) { throw err; }
                    update();
                });
            }
            
            update();
        });
    });
}

Storage.prototype.isGameRoom = function(room, callback) {
    this.connect(function(client, done) {
        client.query("SELECT * FROM game WHERE room = $1", [room], function(err, result) {
            done();
            if (err) { throw err; }
            callback(result.rowCount !== 0);
        });
    });
}

Storage.prototype.getGame = function(room, games, callback) {
    this.connect(function(client, done) {
        client.query("SELECT * FROM game WHERE room = $1", [room], function(err, result1) {
            if (err) { throw err; }
            client.query("SELECT * FROM game_user WHERE room = $1", [room], function(err, result2) {
                done();
                if (err) { throw err; }
                var type = result1.rows[0].type;
                var data = JSON.parse(result1.rows[0].data);
                var players = [];
                result2.rows.forEach(function(player, idx) {
                    player.data = JSON.parse(player.data);
                    players.push(player);
                });
                var game = new games[type](room, players, data);
                callback(game);
            });
        });
    });
}

Storage.prototype.saveGame = function(game, callback) {
    this.connect(function(client, done) {
        client.query("UPDATE game SET data = $1 WHERE room = $2", [JSON.stringify(game.data), game.room], function(err, result) {
            if (err) { throw err; }
            var idx = -1;
            function update() {
                idx++;
                if (idx >= game.players.length) {
                    done();
                    callback();
                    return;
                }
                var player = game.players[idx];
                client.query("UPDATE game_user SET data = $1 WHERE room = $2 AND \"user\" = $3", [JSON.stringify(player.data), game.room, player.user], function(err, result) {
                    if (err) { throw err; }
                    update();
                });
            }
            
            update();
        });
    });
}

Storage.prototype.deleteGame = function(game, callback) {
    this.connect(function(client, done) {
        // because of the CASCADE clause, the table game_user updates automatically
        client.query("DELETE FROM game WHERE room = $1", [game.room], function(err, result) {
            done();
            if (err) { throw err; }
            callback();
        });
    });
}

module.exports = Storage;
