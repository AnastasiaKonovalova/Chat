const WebSocketServer = new require('ws');
const fs = require('fs');
const path = require('path');

const clients = {};
const users = {};
const messages = [];
const photoCount = {};

const webSocketServer = new WebSocketServer.Server({
    port: 8080
});

console.log('сервер запущен');

const writeAsyncImg = (id, data) => {
    fs.writeFile(`./img/${id}_${photoCount[id]}img.jpeg`, data, (err) => {
        console.log( 'write file error', err);
        users[id].photo = `../server/img/${id}_${photoCount[id]}img.jpeg`;
        const newMessage = {
            type: 'newUserImg',
            users: users,
            messages: messages
        };

        Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
    })
}

const unlinkOldImg = (id, data) => {
    fs.unlink(`./img/${id}_${photoCount[id]}img.jpeg`, err => {
        err && console.log('fs.unlink error', err);
        photoCount[id] += 1;
        writeAsyncImg(id, data)
    })
}

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

                switch (socketMessage.type) {
                    case 'auth': 
                        userID = socketMessage.user.id;
                        socketMessage.user.socketID = id;
                        socketMessage.user.photo = users[userID] && users[userID].photo || '../server/img/no_image_icon.png';
                        users[userID] = socketMessage.user;
                        newMessage = {
                            type: 'usersList',
                            users: users,
                            authorizedUser: users[userID],
                            messages: messages
                        };
                        Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
                        break;

                    case 'message': 
                        newMessage = {
                            type: 'message',
                            userID: userID,
                            users: users,
                            time: new Date().toLocaleString('ru', { hour: 'numeric', minute: 'numeric' }),
                            text: socketMessage.text
                        };
                        messages.push(newMessage);
                        authorizedClients = Object.keys(users).map(key => users[key].isAuthorized === true && users[key].socketID);
                        
                        authorizedClients.forEach(id => {
                            id && clients[id].send(JSON.stringify(newMessage))
                        })
                        break;
    
                    default:
                        newMessage = 'unknown message';
                        console.log('unknown message', socketMessage);
                        Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
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
        const unauthorizedUser = Object.keys(users).find(user => users[user].socketID === id);
        const socketMessage = {
            type: 'usersList',
            users: users,
            messages: messages
        }

        if (unauthorizedUser) {
            users[unauthorizedUser].isAuthorized = false;
        }
        Object.keys(clients).forEach( client => clients[client].send(JSON.stringify(socketMessage)) )
    });

})
