const fs = require('fs');
const ramda = require('ramda');
const helpers = require('./helpers');
const defaultImgPath = '../server/img/no_image_icon.png';

const handleError = (error, clients) => {
    const errorResponse = {
        type: 'error',
        error: error.message
    };

    helpers.sendDataToClients(clients, errorResponse)
}

const handleUnauthorize = (socketID) => {
    return new Promise((resolve, reject) => {
        let resultUsers;
        let response;

        helpers.getUsersAsync()
            .then(result => {
                resultUsers = result;
                const unauthorizedUser = Object.keys(resultUsers).find(
                    user => resultUsers[user].socketID === socketID
                );

                if (unauthorizedUser) {
                    resultUsers[unauthorizedUser].isAuthorized = false;
                }
                fs.writeFile(
                    './users.json', 
                    JSON.stringify(resultUsers), 
                    err => err && console.log('fs writeFile users json error', err)
                );

                return helpers.getMessagesAsync()
            })
            .then(resultMessages => {
                resultMessages.forEach(message => message.users = resultUsers);
                fs.writeFile(
                    './messages.json', 
                    JSON.stringify(resultMessages), 
                    err => err && console.log('fs writeFile messages json err', err)
                );
                response = {
                    type: 'unauthorize',
                    users: resultUsers,
                };
                resolve(response)
            })
            .catch(error => {
                console.log('handleUnauthorize promise error', error)
                reject(error)
            })

    })
}

const handleMessageSending = (socketMessage) => {
    return new Promise((resolve, reject) => {
        let response = {
            newMessage: {
                type: 'message',
                userID: socketMessage.userID,
                time: new Date().toLocaleString('ru', { hour: 'numeric', minute: 'numeric' }),
                text: socketMessage.text
            },
            authorizedClients: ''
        }
        let resultUsers;

        helpers.getUsersAsync()
            .then(result => {
                resultUsers = result;
                response.newMessage.users = resultUsers;

                return helpers.getMessagesAsync()
            })
            .then(resultMessages => {
                resultMessages.forEach(message => message.users = resultUsers);
                resultMessages.push(response.newMessage);
                fs.writeFile(
                    './messages.json', 
                    JSON.stringify(resultMessages), 
                    err => err && console.log('fs writeFile messages json error', err)
                );
                response.authorizedClients = Object.keys(resultUsers).map(
                    key => resultUsers[key].isAuthorized === true && resultUsers[key].socketID
                );
                resolve(response)
            })
            .catch(error => {
                console.log('handleMessageSending promise error', error)
                reject(error)
            })

    })
}

const handleFirstAuth = (user, userID) => {
    return new Promise((resolve, reject) => {
        let response;

        user.photo = defaultImgPath;
        fs.writeFile(
            './users.json', 
            JSON.stringify({ [userID]: user }), 
            err => err && console.log('auth fs writeFile users json error', err)
        );
        response = {
            type: 'usersList',
            users: {
                [user.id]: user
            },
            authorizedUser: user
        };
        helpers.getMessagesAsync()
            .then(resultMessages => {
                response.messages = resultMessages;
                resolve(response)
            })
            .catch(error => {
                console.log('handleFirstAuth promise error', error)
                reject(error)
            })
    })
}

const handleNextAuth = (user, userID) => {
    return new Promise((resolve, reject) => {
        let resultUsers;
        let response;
    
        helpers.getUsersAsync()
            .then(result => {
                resultUsers = result;
                user.photo = ramda.path( [`${userID}`, 'photo'], resultUsers ) || defaultImgPath;
                if ( ramda.path( [`${userID}`, 'isAuthorized'], resultUsers ) ) {
                    console.log('этот юзер уже авторизован');
                    throw new Error('authError');
                }
                resultUsers[userID] = user;
                response = {
                    type: 'usersList',
                    users: resultUsers,
                    authorizedUser: resultUsers[userID]
                };
    
                return helpers.getMessagesAsync()                
            })
            .then(resultMessages => {
                console.log('getMessagesAsync')
                response.messages = resultMessages;
                fs.writeFile(
                    './users.json', 
                    JSON.stringify(resultUsers), 
                    err => err && console.log('fs writeFile users json error', err)
                );
                resolve(response)
            })
            .catch(error => {
                console.log('handleNextAuth promise error', error)
                reject(error);
            })
    })    
}

exports.handleError = handleError;
exports.handleFirstAuth = handleFirstAuth;
exports.handleNextAuth = handleNextAuth;
exports.handleMessageSending = handleMessageSending;
exports.handleUnauthorize = handleUnauthorize;