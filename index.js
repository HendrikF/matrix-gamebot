"use strict";
var Cli = require("matrix-appservice-bridge").Cli;
var Bridge = require("matrix-appservice-bridge").Bridge;
var AppServiceRegistration = require("matrix-appservice-bridge").AppServiceRegistration;
var Bot = require("./lib/bot.js");
var ConfigIniParser = require("config-ini-parser").ConfigIniParser;
var fs = require("fs");

var CONFIG_NAME = "config.ini";

var config = new ConfigIniParser();
fs.readFile(CONFIG_NAME, "utf8", function(err, data) {
    if (err) { throw err; }
    config.parse(data);
    
    new Cli({
        registrationPath: config.get("matrix", "registration"),
        generateRegistration: function(reg, callback) {
            reg.setAppServiceUrl(config.get("matrix", "appservice_url"));
            reg.setId(AppServiceRegistration.generateToken());
            reg.setHomeserverToken(AppServiceRegistration.generateToken());
            reg.setAppServiceToken(AppServiceRegistration.generateToken());
            reg.setSenderLocalpart(config.get("matrix", "sender_localpart"));
            callback(reg);
        },
        run: function(_port, _config) {
            var bridge = new Bridge({
                homeserverUrl: config.get("matrix", "homeserver_url"),
                domain: config.get("matrix", "domain"),
                registration: config.get("matrix", "registration"),

                controller: {
                    onEvent: function(request, context) {
                        return bot.onEvent(request, context);
                    }
                }
            });
            var port = config.getNumber("matrix", "appservice_port");
            console.log("listening on port %s", port);
            var bot = new Bot(bridge, config, function() {
                bridge.run(port, _config);
            });
        }
    }).run();
    
});

