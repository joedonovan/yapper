Yapper Group Chat Over YIM
==============================

Yapper is an IM group-chat bot. It logs in to Yahoo! IM and relays all messages between a group of friends (currently uses a static list of friends).

Install
-------

1. Grab the source

2. Edit config.js with the appropriate settings
    
This is what config.js should look like:
        
        exports.config = {
            consumer_key: "", // Oath consumer key for to access Yahoo! APIs
            secret_key: "", // Oath secret for to access Yahoo! APIs
            username: "", // Username of the yapper itself (this is the bots login)
            password: "", // Password of the yapper itself
            friends: [], // This is the list of yapper friends (the people that will get messages from yapper)
            admin_user: "" // This is a super user that should be able to give commands to the yapper while running
        };

Usage
-----

Basic command to get it running:
    node <yapper_root>/bin/server.js

I use Forever to run Yapper in the background as a service. See https://github.com/nodejitsu/forever for more info.

TODO
----

Support dynamically adding and removing friends. It currently maintains a static list.
