var http = require('http'),
https = require('https'),
url = require('url'),
util = require('util'),
uuid = require('../lib/Math.uuid.js'),
config = require('../config.js');

/*
This is what config.js should look like.
exports.config = {
    consumer_key: "", // Oath consumer key for to access Yahoo! APIs
    secret_key: "", // Oath secret for to access Yahoo! APIs
    username: "", // Username of the yapper itself (this is the bots login)
    password: "", // Password of the yapper itself
    friends: [], // This is the list of yapper friends (the people that will get messages from yapper)
    admin_user: "" // This is a super user that should be able to give commands to the yapper while running
};
*/

var pathing = {
    oauth_request_host: "login.yahoo.com",
    oauth_request_path: "/WSLogin/V1/get_auth_token",
    oauth_access_host: "api.login.yahoo.com",
    oauth_access_path: "/oauth/v2/get_token",
    ym_session_host: "developer.messenger.yahooapis.com",
    ym_session_path: "/v1/session",
    ym_message_host: "developer.messenger.yahooapis.com",
    ym_message_path: "/v1/message/yahoo/",
    ym_notification_host: "developer.messenger.yahooapis.com",
    ym_notification_path: "/v1/notifications"
};

function err(where, e) {
    console.error(where + " : " + e);
}

var yapper = {
    request_token: "",
    access_token: {},
    signon_data: {},
    sequence: -1,
    connected: false,
    connecting: false,
    connect: function() {
        if (yapper.connecting) {
            return;
        }

        console.log("Connecting...");
        yapper.connecting = true;
        yapper.fetch_request_token(function() {
            //console.log("Request token: " + this.request_token);
            yapper.fetch_access_token(function() {
                //console.log("Access token: " + JSON.stringify(yapper.access_token));
                yapper.signon(function() {
                    console.log("Connected successfully");
                    yapper.connected = true;
                    yapper.connecting = false;
                    return;
                });
            });
        });
    },
    fetch_request_token: function(cb) {
        console.log("   In fetch_request_token");
        var request_path = pathing.oauth_request_path + "?login=" + config.config.username;
        request_path += "&passwd=" + config.config.password;
        request_path += "&oauth_consumer_key=" + config.config.consumer_key;

        var options = {
            hostname: pathing.oauth_request_host,
            port: 443,
            method: "GET",
            path: request_path
        };

        var req = https.get(options,
        function(res) {
            //console.log('STATUS: ' + res.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(res.headers));
            if (res.statusCode === 200) {
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data",
                function(chunk) {
                    responseBody += chunk;
                });
                res.on("end",
                function(ctx) {
                    request_token = responseBody.split('=')[1].trim();
                    cb();
                });
            } else {
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data",
                function(chunk) {
                    responseBody += chunk;
                });
                res.on("end",
                function(ctx) {
                    err("fetch_request_token", "Response headers: " + JSON.stringify(res.headers));
                    err("fetch_request_token", "Response content: " + responseBody);
                });
                err("fetch_request_token", "Bad response code - " + res.statusCode);
            }
        });

        req.on('error',
        function(e) {
            err("fetch_request_token", e.message);
        });
    },
    fetch_access_token: function(cb) {
        console.log("   In fetch_access_token");
        var request_path = pathing.oauth_access_path + "?oauth_consumer_key=" + config.config.consumer_key;
        request_path += "&oauth_nonce=" + Math.uuidFast();
        request_path += "&oauth_signature=" + config.config.secret_key + '%26';
        request_path += "&oauth_signature_method=PLAINTEXT";
        request_path += "&oauth_timestamp=" + Date.now();
        request_path += "&oauth_token=" + request_token;
        request_path += "&oauth_version=1.0";

        var options = {
            hostname: pathing.oauth_access_host,
            port: 443,
            method: "GET",
            path: request_path
        };

        var req = https.get(options,
        function(res) {
            //console.log('STATUS: ' + res.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(res.headers));
            if (res.statusCode === 200) {
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data",
                function(chunk) {
                    responseBody += chunk;
                });
                res.on("end",
                function(ctx) {
                    var token_peices = responseBody.split('&');
                    for (var i = 0; i < token_peices.length; i++) {
                        yapper.access_token[token_peices[i].split('=')[0]] = token_peices[i].split('=')[1];
                    }
                    cb();
                });
            } else {
                err("fetch_access_token", "Bad response code - " + res.statusCode);
            }
        });

        req.on('error',
        function(e) {
            err(this, e.message);
        });
    },
    signon: function(cb) {
        console.log("   In signon");
        var request_path = pathing.ym_session_path + "?oauth_consumer_key=" + config.config.consumer_key;
        request_path += "&oauth_nonce=" + Math.uuidFast();
        request_path += "&oauth_signature=" + config.config.secret_key + '%26' + yapper.access_token.oauth_token_secret;
        request_path += "&oauth_signature_method=PLAINTEXT";
        request_path += "&oauth_timestamp=" + Date.now();
        request_path += "&oauth_token=" + yapper.access_token.oauth_token;
        request_path += "&oauth_version=1.0";
        request_path += "&notifyServerToken=1";

        var postData = {
            presenceState: 0,
            presenceMessage: "Yapper FTW"
        };

        var postBody = JSON.stringify(postData);

        var options = {
            hostname: pathing.ym_session_host,
            port: 80,
            path: request_path,
            method: "POST",
            headers: {
                "Content-Length": postBody.length,
                "Content-Type": "application/json; charset=utf-8"
            }
        };

        var req = http.request(options,
        function(res) {
            //console.log('STATUS: ' + res.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(res.headers));
            if (res.statusCode === 200) {
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data",
                function(chunk) {
                    responseBody += chunk;
                });
                res.on("end",
                function(ctx) {
                    yapper.signon_data = JSON.parse(responseBody);
                    yapper.signon_data.notifytoken = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
                    cb();
                });
            } else {
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data",
                function(chunk) {
                    responseBody += chunk;
                });
                res.on("end",
                function(ctx) {
                    err("signon", "Response content: " + responseBody);
                });
                err("signon", "Bad response code - " + res.statusCode);
            }
        });

        req.write(postBody);
        req.end();

        req.on('error',
        function(e) {
            err("signon", e.message);
        });
    },
    send_message: function(msg, from) {
        //console.log("In send_message to send: " + msg);
        for (var i = 0; i < config.config.friends.length; i++) {
            if (config.config.friends[i] === from) continue;

            console.log("Sending message to: " + config.config.friends[i]);
            var request_path = pathing.ym_message_path + config.config.friends[i] + "?oauth_consumer_key=" + config.config.consumer_key;
            request_path += "&oauth_nonce=" + Math.uuidFast();
            request_path += "&oauth_signature=" + config.config.secret_key + '%26' + yapper.access_token.oauth_token_secret;
            request_path += "&oauth_signature_method=PLAINTEXT";
            request_path += "&oauth_timestamp=" + Date.now();
            request_path += "&oauth_token=" + yapper.access_token.oauth_token;
            request_path += "&oauth_version=1.0";
            request_path += "&sid=" + yapper.signon_data.sessionId;

            var postData = {
                message: msg
            };

            var postBody = JSON.stringify(postData);

            var options = {
                hostname: pathing.ym_message_host,
                port: 80,
                path: request_path,
                method: "POST",
                headers: {
                    "Content-Length": postBody.length,
                    "Content-Type": "application/json; charset=utf-8"
                }
            };

            var req = http.request(options,
            function(res) {
                //console.log('STATUS: ' + res.statusCode);
                //console.log('HEADERS: ' + JSON.stringify(res.headers));
                if (res.statusCode === 200) {
                    var responseBody = "";
                    res.setEncoding("utf8");
                    res.on("data",
                    function(chunk) {
                        responseBody += chunk;
                    });
                    res.on("end",
                    function(ctx) {
                        });
                } else {
                    var responseBody = "";
                    res.setEncoding("utf8");
                    res.on("data",
                    function(chunk) {
                        responseBody += chunk;
                    });
                    res.on("end",
                    function(ctx) {
                        err("send_message", "Response content: " + responseBody);
                    });
                    err("send_message", "Bad response code - " + res.statusCode);
                }
            });

            req.write(postBody);
            req.end();

            req.on('error',
            function(e) {
                err("send_message", e.message);
            });
        }
    },
    handle_notifications: function(cb) {
        //console.log("Checking notifications");
        var request_path = pathing.ym_notification_path + "?oauth_consumer_key=" + config.config.consumer_key;
        request_path += "&oauth_nonce=" + Math.uuidFast();
        request_path += "&oauth_signature=" + config.config.secret_key + '%26' + yapper.access_token.oauth_token_secret;
        request_path += "&oauth_signature_method=PLAINTEXT";
        request_path += "&oauth_timestamp=" + Date.now();
        request_path += "&oauth_token=" + yapper.access_token.oauth_token;
        request_path += "&oauth_version=1.0";
        request_path += "&sid=" + yapper.signon_data.sessionId;
        request_path += "&seq=" + (yapper.sequence + 1);
        request_path += "&count=100";
        
        //console.log("Asking for messages with sequence=" + (yapper.sequence + 1));

        var options = {
            hostname: pathing.ym_notification_host,
            port: 80,
            method: "GET",
            path: request_path,
            headers: {
                "Content-type": "application/json; charset=utf-8",
                "host": pathing.ym_notification_host
            }
        };

        var req = http.get(options,
        function(res) {
            //console.log('STATUS: ' + res.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(res.headers));
            if (res.statusCode === 200) {
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data",
                function(chunk) {
                    responseBody += chunk;
                });
                res.on("end",
                function(ctx) {
                    var notifications = JSON.parse(responseBody);
                    //console.log(responseBody);
                    if (notifications.hasOwnProperty("responses")) {
                        var delay = 0;
                        for (var i = 0; i < notifications.responses.length; i++) {
                            var curr_notification = notifications.responses[i];
                            var curr_sequence = 0;

                            if (curr_notification.buddyInfo) {
                                curr_sequence = curr_notification.buddyInfo.sequence;
                            }
                            if (curr_notification.buddyAuthorize) {
                                curr_sequence = curr_notification.buddyAuthorize.sequence;
                            }
                            if (curr_notification.message) {
                                var curr_msg = curr_notification.message;
                                curr_sequence = curr_msg.sequence;
                                if(curr_sequence > yapper.sequence) {
                                    console.log("Received message: <" + curr_msg.sender + "> " + curr_msg.msg);
                                    if(config.config.friends.indexOf(curr_msg.sender) >= 0) {
                                        setTimeout(function(msg) {
                                            yapper.send_message("<b>[" + msg.sender + "]</b> " + msg.msg, msg.sender);
                                        }.bind(this, curr_msg), delay);
                                    } else {
                                        console.log("Dropped message from unknown sender: " + curr_msg.sender);
                                    }
                                }
                                delay += 100;
                            }
                            if (curr_sequence > yapper.sequence) {
                                yapper.sequence = curr_sequence;
                            }
                        }
                    }
                });
            } else if (res.statusCode === 401){
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data",
                function(chunk) {
                    responseBody += chunk;
                });
                res.on("end",
                function(ctx) {
                    err("handle_notifications", "Response headers: " + JSON.stringify(res.headers));
                    err("handle_notifications", "Response content: " + responseBody);
                    /* 
                    I would check the content of the headers if I weren't lazy... Just assuming a token timeout for now.
                    Here's what the headers look like when a token times out:
                    {"date":"Tue, 06 Mar 2012 00:24:55 GMT","www-authenticate":"OAuth oauth_problem=\"token_expired\", realm=\"yahooapis.com\"","connection":"close","transfer-encoding":"chunked","content-type":"application/xml","cache-control":"private"}
                    */
                    yapper.connected = false;
                });
                err("handle_notifications", "Bad response code - " + res.statusCode);
            } else {
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data",
                function(chunk) {
                    responseBody += chunk;
                });
                res.on("end",
                function(ctx) {
                    err("handle_notifications", "Response headers: " + JSON.stringify(res.headers));
                    err("handle_notifications", "Response content: " + responseBody);
                });
                err("handle_notifications", "Bad response code - " + res.statusCode);
            }
        });

        req.on('error',
        function(e) {
            err("handle_notifications", e.message);
        });
    },
    run: function() {
        if (yapper.connected) {
            yapper.handle_notifications();
        } else {
            yapper.connect();
        }
    }
};

yapper.connect();

setInterval(yapper.run, 3000);