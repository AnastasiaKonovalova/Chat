const WebSocketServer = new require('ws');
const fs = require('fs');
const helpers = require('./helpers/helpers');
const cases = require('./helpers/cases');

const clients = {};
const photoCount = {};
const webSocketServer = new WebSocketServer.Server({
    port: 8081
});

console.log('сервер запущен');

webSocketServer.on('connection', function(ws) {
    const id = Date.now();
    let userID;
    let authorizedClients;

    clients[id] = ws;
    console.log('новое соединение ' + id);

    ws.on('message', function(message) {
        if (typeof(message) === typeof('')) {
            let socketMessage;
            let dataResponse;
            let user;
            const errorResponse = {
                type: 'error',
                error: ''
            };        

            try {
                socketMessage = JSON.parse(message);
            } catch (error) { 
                console.log('ws on message JSON error', error)
                cases.handleError(error, clients)
            }
            if (socketMessage) {
                switch (socketMessage.type) {
                    case 'auth': 
                        user = socketMessage.user;
                        userID = user.id;
                        user.socketID = id;
                        if (fs.existsSync('./users.json')) {
                            cases.handleNextAuth(user, userID)
                                .then(resultResponse => {
                                    helpers.sendDataToClients(clients, resultResponse)
                                })
                                .catch(error => {
                                    console.log('auth case handleNextAuth error, clients', error);
                                    errorResponse.error = error.message;
                                    clients[id].send(JSON.stringify(errorResponse))
                                })
                        } else {
                            cases.handleFirstAuth(user, userID)
                                .then(resultResponse => {
                                    helpers.sendDataToClients(clients, resultResponse)
                                })
                                .catch(error => {
                                    console.log('auth case handleFirstAuth error', error);
                                    cases.handleError(error, clients)
                                })
                        }
                        break;
    
                    case 'message': 
                        cases.handleMessageSending(socketMessage)
                            .then(resultResponse => {
                                dataResponse = resultResponse.newMessage;
                                authorizedClients = resultResponse.authorizedClients;
                                authorizedClients.forEach(id => {
                                    id && clients[id].send(JSON.stringify(dataResponse))
                                });
                            })
                            .catch(error => {
                                console.log('message case handleMessageSending error', error);
                                cases.handleError(error, clients)
                            })
                        break;
    
                    default:
                        dataResponse = {
                            type: 'unknown message',
                            data: socketMessage
                        };
                        console.log('unknown message', socketMessage);
                        helpers.sendDataToClients(clients, dataResponse)
                }
            }
        } else {
            if (fs.existsSync(`./img/${userID}_${photoCount[userID]}img.jpeg`)) {
                helpers.unlinkOldImg(userID, photoCount)
                    .then(() => {
                        helpers.writeImgAsync(userID, message, photoCount, clients)
                    })
            } else {
                photoCount[userID] = 0;
                helpers.writeImgAsync(userID, message, photoCount, clients)
            }
        }
    });

    ws.on('close', function() {
        console.log('соединение закрыто ' + id);
        delete clients[id];
        cases.handleUnauthorize(id)
            .then(result => {
                helpers.sendDataToClients(clients, result)
            })
    });
});