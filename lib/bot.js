'use strict';
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
    var text = event.content.body;
    var text_lower = text.toLowerCase();
    if (text_lower.indexOf(this.user_id) > -1) {
        var matches = text_lower.match(REGEXP_USER_ID);
        var users = [event.user_id];
        for (var i in matches) {
            var uid = matches[i];
            if (uid == this.user_id) {
                continue;
            }
            users.push(uid);
        }
        this.bridge.getIntent().createRoom({
            visibility: "private",
            invite: users
        }).then(function() {
            // TODO
        });
    }
}

module.exports = Bot;
