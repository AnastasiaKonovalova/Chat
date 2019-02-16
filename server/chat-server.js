const WebSocketServer = new require('ws');
const fs = require('fs');
const path = require('path');

const clients = {};
const users = {};
const messages = [];
let i = 0;
const photoCount = {};

const webSocketServer = new WebSocketServer.Server({
    port: 8080
});
console.log('сервер запущен');

// function getAsyncMessages() {
//     let result = new Promise((resolve, reject) => {
//         fs.readFile('./messages.json', 'utf8', (err, data) => {    
//             if (err) {
//                 console.log('readFile(./messages.json)', err);
//                 resolve(false);
//             } else {
//                 try {
//                     resolve(JSON.parse(data))
//                 } catch (error) {
//                     console.log('JSON.parse ./messages.json', error);
//                     reject(error);
//                 }
//             }
//         });
//     }) 

//     return result;
// }

const unlinkOldImg = (id, data) => {
    fs.unlink(`./img/${id}_${photoCount[id]}img.jpeg`, err => {
        console.log('fs.unlink error', err);
        photoCount[id] += 1;
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
                            // console.log(' authorizedClients.forEach', newMessage)
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
            console.log('photoCount', photoCount)
            if (fs.existsSync(`./img/${userID}_${photoCount[userID]}img.jpeg`)) {
                console.log('fs.existsSync photoCount', photoCount)
                console.log('fs.existsSync', fs.existsSync(`./img/${userID}_${photoCount[userID]}img.jpeg`))
                unlinkOldImg(userID, message)
            } else {

            console.log('first img')
                photoCount[userID] = 0;
                fs.writeFile(`./img/${userID}_${++photoCount[userID]}img.jpeg`, message, (err) => {
                    console.log( 'write file error', err);
                    users[userID].photo = `../server/img/${userID}_${photoCount[userID]}img.jpeg`;
                    const newMessage = {
                        type: 'newUserImg',
                        users: users,
                        messages: messages
                    };
                    Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
                })
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

// class AuthorizedUser {
//     constructor (ws, id) {
//         this.id = id;
//         this.userID;
//         this.authorizedClients;
//         this.ws = ws;
//     }

//     handleWSMessages () {
//         this.ws.on('message', function(message) {
//             if (typeof(message) === typeof('')) {
//                 try {
//                     const socketMessage = JSON.parse(message);
//                     let newMessage;
    
//                     switch (socketMessage.type) {
//                         case 'auth': 
//                             this.userID = socketMessage.user.id;
//                             socketMessage.user.socketID = this.id;
//                             socketMessage.user.photo = users[this.userID] && users[this.userID].photo || '../server/img/no_image_icon.png';
//                             users[this.userID] = socketMessage.user;
//                             newMessage = {
//                                 type: 'usersList',
//                                 users: users,
//                                 authorizedUser: users[this.userID],
//                                 messages: messages
//                             };
//                             break;

//                         case 'message': 
//                             newMessage = {
//                                 type: 'message',
//                                 userID: this.userID,
//                                 // users: users,
//                                 time: new Date().toLocaleString('ru', { hour: 'numeric', minute: 'numeric' }),
//                                 text: socketMessage.text
//                             };
//                             messages.push(newMessage);
//                             this.authorizedClients = Object.keys(users).map(key => users[key].isAuthorized === true && users[key].socketID);
                            
//                             this.authorizedClients.forEach(id => {
//                                 console.log(' authorizedClients.forEach', newMessage)
//                                 id && clients[id].send(JSON.stringify(newMessage))
//                             })
//                             break;
        
//                         default:
//                             newMessage = 'unknown message';
//                             console.log('unknown message', socketMessage);
//                             Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
//                     }
//                 } catch (error) {
//                     console.log('JSON error', error)
//                     Object.keys(clients).forEach(key => clients[key].send('Произошла ошибка' + error))
//                 }
//             } else {
//                 fs.writeFile(`./img/${this.userID}_img.jpeg`, message, (err) => {
//                     console.log( 'write file error', err);
//                     users[this.userID].photo = `../server/img/${this.userID}_img.jpeg`;
//                     const newMessage = {
//                         type: 'newUserImg',
//                         users: users,
//                         messages: messages
//                     };
        
//                     console.log('users[userID].photo', users)
//                     Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
//                 })
//             }
//         });
//     }

//     handleWSClose() {
//         this.ws.on('close', function() {
//             console.log('соединение закрыто ' + this.id);
//             delete clients[this.id];
//             const unauthorizedUser = Object.keys(users).find(user => users[user].socketID === this.id);
//             const socketMessage = {
//                 type: 'usersList',
//                 users: users,
//                 messages: messages
//             }
    
//             if (unauthorizedUser) {
//                 users[unauthorizedUser].isAuthorized = false;
//             }
//             Object.keys(clients).forEach( client => clients[client].send(JSON.stringify(socketMessage)) )
//         });
//     }
// }

// webSocketServer.on('connection', function(ws) {
//     const id = Date.now();
    // let userID;
    // let authorizedClients;

//     clients[id] = ws;
//     console.log("новое соединение " + id);

    // ws.on('message', function(message) {
    //     if (typeof(message) === typeof('')) {
    //         try {
    //             const socketMessage = JSON.parse(message);
    //             let newMessage;

    //             switch (socketMessage.type) {
    //                 case 'message': 
    //                     newMessage = {
    //                         type: 'message',
    //                         userID: userID,
    //                         users: users,
    //                         time: new Date().toLocaleString('ru', { hour: 'numeric', minute: 'numeric' }),
    //                         text: socketMessage.text
    //                     };
    //                     fs.readFile('./messages.json', 'utf8', (err, data) => {
    //                         if (err) {
    //                             fs.writeFile('./messages.json', JSON.stringify([newMessage]), err => console.log(err))
    //                         } else {
    //                             fs.writeFile('./messages.json', JSON.stringify([...JSON.parse(data), newMessage]), err => console.log(err))
    //                         }
    //                     })
    //                     // messages.push(newMessage);
    //                     authorizedClients = Object.keys(users).map(key => users[key].isAuthorized === true && users[key].socketID);
                        
    //                     authorizedClients.forEach(id => {
    //                         console.log(' authorizedClients.forEach', newMessage)
    //                         id && clients[id].send(JSON.stringify(newMessage))
    //                     })

    //                     break;

    //                 case 'auth': 
    //                     userID = socketMessage.user.id;
    //                     socketMessage.user.socketID = id;
    //                     socketMessage.user.photo = users[userID] && users[userID].photo || '../server/img/no_image_icon.png';
    //                     users[userID] = socketMessage.user;
    //                     newMessage = {
    //                         type: 'usersList',
    //                         users: users,
    //                         authorizedUser: users[userID]
    //                     };
    //                     getAsyncMessages()
    //                         .then(result => newMessage.messages = result || [])
    //                         .then(() => {
    //                             Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
    //                         }).catch(error => console.log('promise error', error))
    //                     break;

    //                 default:
    //                     newMessage = 'unknown message';
    //                     console.log('unknown message', socketMessage)
    //             }
    //         } catch (error) {
    //             console.log('JSON error', error)
    //             Object.keys(clients).forEach(key => clients[key].send('Произошла ошибка' + error))
    //         }
    //     } else {
    //         fs.writeFile(`./img/${userID}_img.jpeg`, message, (err) => {
    //             console.log( 'write file error', err);
    //             users[userID].photo = `../server/img/${userID}_img.jpeg`;
    //             const newMessage = {
    //                 type: 'newUserImg',
    //                 users: users,
    //                 // messages: messages
    //             };

    //             getAsyncMessages()
    //                 .then(result => newMessage.messages = result || [])
    //                 .then(() => {
    //                     Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
    //                 }).catch(error => console.log('promise error', error))

    //             console.log('users[userID].photo', users)
    //             // Object.keys(clients).forEach(key => clients[key].send(JSON.stringify(newMessage)))
    //         })
    //     }
    // });

    // ws.on('close', function() {
    //     console.log('соединение закрыто ' + id);
    //     delete clients[id];
    //     const unauthorizedUser = Object.keys(users).find(user => users[user].socketID === id);
    //     const socketMessage = {
    //         type: 'usersList',
    //         users: users,
    //         messages: messages
    //     }

    //     if (unauthorizedUser) {
    //         users[unauthorizedUser].isAuthorized = false;
    //     }
    //     Object.keys(clients).forEach( client => clients[client].send(JSON.stringify(socketMessage)) )
    // });

// });