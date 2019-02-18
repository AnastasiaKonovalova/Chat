const WebSocketServer = new require('ws');
const fs = require('fs');
const path = require('path');

const clients = {};
const photoCount = {};
const webSocketServer = new WebSocketServer.Server({
    port: 8080
});

console.log('сервер запущен');

function getAsyncMessages() {
    let result = new Promise((resolve, reject) => {
        if ( fs.existsSync('./messages.json') ) {
            fs.readFile('./messages.json', 'utf8', (err, data) => {    
                if (err) {
                    console.log('readFile(./messages.json)', err);
                    reject(err);
                } else {
                    try {
                        resolve(JSON.parse(data))
                    } catch (error) {
                        console.log('JSON.parse ./messages.json', error);
                        reject(error);
                    }
                }
            });
        } else {
            resolve([])
        }
    }) 

    return result;
};

function getAsyncUsers() {
    let result = new Promise((resolve, reject) => {
        fs.readFile('./users.json', 'utf8', (err, data) => {    
            if (err) {
                console.log('readFile(./users.json)', err);
                reject(err);
            } else {
                try {
                    resolve(JSON.parse(data))
                } catch (error) {
                    console.log('JSON.parse ./users.json', error);
                    reject(error);
                }
            }
        });
    }) 

    return result;
};

webSocketServer.on('connection', function(ws) {
    const id = Date.now();
    let userID;
    let authorizedClients;

    clients[id] = ws;
    console.log("новое соединение " + id);

    ws.on('message', function(message) {
        if (typeof(message) === typeof('')) {
            try {
                const socketMessage = JSON.parse(message);
                let newMessage;
                let resultUsers;

                switch (socketMessage.type) {
                    case 'auth': 
                        userID = socketMessage.user.id;
                        socketMessage.user.socketID = id;
                        if (fs.existsSync('./users.json')) {
                            getAsyncUsers()
                                .then(result => {
                                    resultUsers = result;
                                    socketMessage.user.photo = resultUsers[userID] && resultUsers[userID].photo || '../server/img/no_image_icon.png';
                                    resultUsers[userID] = socketMessage.user;
                                    newMessage = {
                                        type: 'usersList',
                                        users: resultUsers,
                                        authorizedUser: resultUsers[userID]
                                    };

                                    return getAsyncMessages()                
                                })
                                .then(resultMessages => {
                                    newMessage.messages = resultMessages;
                                    Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)));
                                    fs.writeFile(
                                        './users.json', 
                                        JSON.stringify(resultUsers), 
                                        err => err && console.log('fs writeFile users json error', err)
                                    )
                                })
                                .catch(error => console.log('auth promise error', error))
                        } else {
                            socketMessage.user.photo = '../server/img/no_image_icon.png';
                            fs.writeFile('./users.json', JSON.stringify({ [userID]: socketMessage.user }), err => err && console.log('auth fs writeFile users json error', err));
                            newMessage = {
                                type: 'usersList',
                                users: {
                                    [socketMessage.user.id]: socketMessage.user
                                },
                                authorizedUser: socketMessage.user
                            };
                            getAsyncMessages()
                                .then(resultMessages => {
                                    newMessage.messages = resultMessages;
                                    Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
                                })
                                .catch(error => console.log('auth getAsyncMessages error', error))
                        }
                        break;

                    case 'message': 
                        newMessage = {
                            type: 'message',
                            userID: socketMessage.userID,
                            time: new Date().toLocaleString('ru', { hour: 'numeric', minute: 'numeric' }),
                            text: socketMessage.text
                        };
                        getAsyncUsers()
                            .then(result => {
                                resultUsers = result;
                                newMessage.users = resultUsers;

                                return getAsyncMessages()
                            })
                            .then(resultMessages => {
                                resultMessages.forEach(message => message.users = resultUsers);
                                resultMessages.push(newMessage);
                                authorizedClients = Object.keys(resultUsers).map(key => resultUsers[key].isAuthorized === true && resultUsers[key].socketID);
                                authorizedClients.forEach(id => {
                                    id && clients[id].send(JSON.stringify(newMessage))
                                });
                                fs.writeFile(
                                    './messages.json', 
                                    JSON.stringify(resultMessages), 
                                    err => err && console.log('fs writeFile messages json error', err)
                                );
                            })
                            .catch(error => console.log(' case message promise error', error))
                        break;

                    default:
                        newMessage = 'unknown message';
                        console.log('unknown message', socketMessage)
                }
            } catch (error) {
                console.log('JSON error', error)
                Object.keys(clients).forEach(key => clients[key].send('Произошла ошибка' + error))
            }
        } else {
            if (fs.existsSync(`./img/${userID}_${photoCount[userID]}img.jpeg`)) {
                unlinkOldImg(userID, message)
            } else {
                photoCount[userID] = 0;
                writeAsyncImg(userID, message)
            }
        }
    });

    ws.on('close', function() {
        console.log('соединение закрыто ' + id);
        delete clients[id];
        let resultUsers;

        getAsyncUsers()
            .then(result => {
                resultUsers = result;
                const unauthorizedUser = Object.keys(resultUsers).find(user => resultUsers[user].socketID === id);
                
                if (unauthorizedUser) {
                    resultUsers[unauthorizedUser].isAuthorized = false;
                };
                const socketMessage = {
                    type: 'unauthorize',
                    users: resultUsers,
                };

                Object.keys(clients).forEach( client => clients[client].send(JSON.stringify(socketMessage)) )
                fs.writeFile(
                    './users.json', 
                    JSON.stringify(resultUsers), 
                    err => err && console.log('fs writeFile users json error', err)
                );

                return getAsyncMessages()
            })
            .then(resultMessages => {
                resultMessages.forEach(message => message.users = resultUsers);
                fs.writeFile(
                    './messages.json', 
                    JSON.stringify(resultMessages), 
                    err => err && console.log('fs writeFile messages json err', err)
                );
            })
            .catch(error => console.log('on close promise error', error))
    });

});

const writeAsyncImg = (id, data) => {
    fs.writeFile(`./img/${id}_${photoCount[id]}img.jpeg`, data, err => {
        err && console.log( 'write file error', err);
        let resultUsers;

        getAsyncUsers()
            .then(result => {
                resultUsers = result;
                resultUsers[id].photo = `../server/img/${id}_${photoCount[id]}img.jpeg`;

                return getAsyncMessages()
            })
            .then(resultMessages => {
                resultMessages.forEach(message => message.users = resultUsers);
                const newMessage = {
                    type: 'newUserImg',
                    users: resultUsers,
                    messages: resultMessages
                };

                Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)));
                fs.writeFile(
                    './users.json', 
                    JSON.stringify(resultUsers), 
                    err => err && console.log('fs writeFile users json error', err)
                );
                fs.writeFile(
                    './messages.json', 
                    JSON.stringify(resultMessages), 
                    err => err && console.log('fs writeFile messages json err', err)
                );
            })
            .catch(error => console.log('writeAsyncImg promise error', error))
    })
}

const unlinkOldImg = (id, data) => {
    fs.unlink(`./img/${id}_${photoCount[id]}img.jpeg`, err => {
        err && console.log('fs.unlink error', err);
        photoCount[id] += 1;
        writeAsyncImg(id, data)
    })
}
