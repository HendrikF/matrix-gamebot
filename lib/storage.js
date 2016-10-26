'use strict';
var pg = require('pg');
var SchemaManager = require('./schemamanager');
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
            return console.error('error fetching client from pool', err);
        }
        callback(client, done);
    });
}

module.exports = Storage;
