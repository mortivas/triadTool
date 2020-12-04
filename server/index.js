const webSocketsServerPort = 8000;
const webSocketServer = require('websocket').server;
const http = require('http');
// Spinning the http server and the websocket server.
const server = http.createServer();
console.log("server started");
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
    httpServer: server
});

// Generates unique ID for every new connection
const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4();
};

// I'm maintaining all active connections in this object
const clients = {};

const conversations = {};

// I'm maintaining all active users in this object
const users = {};

const sendMessage = (conversation, json, userId) => {
    // We are sending the current data to all connected clients
    console.log(JSON.stringify(JSON.parse(json), null, 2));

    if (!conversation) return;

    if (userId) {
        clients[userId].sendUTF(json);

    } else {
        conversation.users.forEach((user) => {
            clients[user.userId].sendUTF(json);
        })
    }
};

const sendLogUpdate = (conversation) => {
        if (!conversation) return;

        conversation.users.forEach((user) => {
            clients[user.userId].sendUTF(JSON.stringify({
                type: typesDef.UPDATE_LOG_EVENT,
                data: {
                    log: conversation.log
                }
            }));
        })
    };

const sendError = (userId, message) => {
    clients[userId].sendUTF(
        (JSON.stringify({
            type: typesDef.ERROR_EVENT,
            data: {
                message
            }
        }))
    )
};

const sendBans = (conversation) => {
    if (conversation.users.length < 2) {
        return;
    }
    const user1 = conversation.users[0];
    const user2 = conversation.users[1];
    const ban1 = conversation.bans[user1.userId];
    const ban2 = conversation.bans[user2.userId];

    if (ban1 && ban2) {
        conversation.log.push(`${user1.username} banned ${ban1}`);
        conversation.log.push(`${user2.username} banned ${ban2}`);
        sendLogUpdate(conversation);
    }
};


const typesDef = {
    CREATE_CONVERSATION_EVENT: "createConversationEvent",
    JOIN_CONVERSATION_EVENT: "joinConversationEvent",
    BAN_DECK_EVENT: "banDeckEvent",
    USER_DISCONNECTED_EVENT: "userDisconnectedEvent",
    UPDATE_LOG_EVENT: "logUpdateEvent",
    ERROR_EVENT: "errorEvent",
};

wsServer.on('request', function (request) {
    var userId = getUniqueID();
    console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');

    // You can rewrite this part of the code to accept only the requests from allowed origin
    const connection = request.accept(null, request.origin);
    clients[userId] = connection;
    console.log('connected: ' + userId + ' in ' + Object.getOwnPropertyNames(clients));
    connection.on('message', function (message) {
        var conversation = null;
        if (message.type === 'utf8') {
            const dataFromClient = JSON.parse(message.utf8Data);
            const json = {type: dataFromClient.type};
            var conversationId = dataFromClient.conversationId;
            var user = users[dataFromClient.userId];

            console.log(JSON.stringify(dataFromClient, null, 2));

            switch (dataFromClient.type) {
                case typesDef.CREATE_CONVERSATION_EVENT:
                    users[userId] = dataFromClient;

                    user = users[userId];
                    user.userId = userId;

                    conversationId = getUniqueID();
                    conversations[conversationId] = {
                        id: conversationId,
                        log: [],
                        users: [],
                        bans: {},
                    };
                    conversation = conversations[conversationId];
                    conversation.conversationId = conversationId;
                    conversation.users.push(user);
                    conversation.log.push(`${dataFromClient.username} joined conversation`);
                    conversation.log.push(`Conversation ID: ${conversationId}. Send it to your opponent`);

                    json.data = {userId, conversation};

                    sendMessage(conversation, JSON.stringify(json), userId);
                    sendLogUpdate(conversation);

                    break;
                case typesDef.JOIN_CONVERSATION_EVENT:
                    conversation = conversations[conversationId];
                    console.log(conversation);
                    if (!conversation) {
                        return sendError(userId, "conversation not found");
                    }

                    if (conversation.users.length > 2) {
                        return sendError(userId, "two players already in conversation");
                    }

                    users[userId] = dataFromClient;
                    user = users[userId];
                    user.userId = userId;
                    conversation.users.push(user);
                    conversation.log.push(`${dataFromClient.username} joined conversation`);

                    json.data = {userId, conversation};

                    sendMessage(conversation, JSON.stringify(json), userId);
                    sendLogUpdate(conversation);

                    break;
                case typesDef.BAN_DECK_EVENT:
                    var id = dataFromClient.userId;
                    var bannedDeck = dataFromClient.bannedDeck;

                    user = users[id];
                    conversation = conversations[conversationId];

                    conversation.bans[id] = bannedDeck;
                    conversation.log.push(`${user.username} made their choice`);

                    json.data = {
                        bannedDeck,
                        conversation
                    };

                    sendMessage(conversation, JSON.stringify(json), userId);
                    sendLogUpdate(conversation);
                    sendBans(conversation);
                    break;
            }
        }
    });
    // user disconnected
    connection.on('close', function (connection) {
        console.log((new Date()) + " Peer " + userId + " disconnected.");
        delete clients[userId];
    });
});
