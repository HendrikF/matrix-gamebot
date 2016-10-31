"use strict";
var sdk = require("matrix-js-sdk");
var Bot = require("./lib/bot.js");
var ConfigIniParser = require("config-ini-parser").ConfigIniParser;
var fs = require("fs");

var CONFIG_NAME = "config.ini";

var config = new ConfigIniParser();
fs.readFile(CONFIG_NAME, "utf8", function(err, data) {
    if (err) { throw err; }
    config.parse(data);
    
    var loginClient = sdk.createClient(config.get("auth", "homeserver"));
    loginClient.loginWithPassword(config.get("auth", "user"), config.get("auth", "password")).then(function(response) {
        var access_token = response.access_token;
        
        var client = sdk.createClient({
            baseUrl: config.get("auth", "homeserver"),
            accessToken: access_token,
            userId: config.get("auth", "user")
        });
        
        var bot = new Bot(client, config, function() {
            client.startClient();
        });
        
    }, console.log);
    
    
    
    
});

