const fs = require('fs');

const sendDataToClients = (clients, data) => {
    Object.keys(clients).forEach(
        key => clients[key].send(JSON.stringify(data))
    )
}

const getMessagesAsync = () => {
    return new Promise((resolve, reject) => {
        if ( fs.existsSync('./messages.json') ) {
            fs.readFile('./messages.json', 'utf8', (err, data) => {    
                if (err) {
                    console.log('readFile messages json', err);
                    reject(err);
                } else {
                    try {
                        resolve(JSON.parse(data))
                    } catch (error) {
                        console.log('JSON parse messages json', error);
                        reject(error);
                    }
                }
            });
        } else {
            resolve([])
        }
    }) 
}

const getUsersAsync = () => {
    return new Promise((resolve, reject) => {
        fs.readFile('./users.json', 'utf8', (err, data) => {    
            if (err) {
                console.log('readFile usersjson)', err);
                reject(err);
            } else {
                try {
                    resolve(JSON.parse(data))
                } catch (error) {
                    console.log('JSON parse users json', error);
                    reject(error);
                }
            }
        });
    }) 
}

const writeImgAsync = (id, data, photoCount, clients) => {
    fs.writeFile(`./img/${id}_${photoCount[id]}img.jpeg`, data, err => {
        err && console.log( 'write file error', err);
        let resultUsers;

        getUsersAsync()
            .then(result => {
                resultUsers = result;
                resultUsers[id].photo = `../server/img/${id}_${photoCount[id]}img.jpeg`;

                return getMessagesAsync()
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
            .catch(error => console.log('writeImgAsync promise error', error))
    })
}

const unlinkOldImg = (id, photoCount) => {
    return new Promise((resolve, reject) => {
        fs.unlink(`./img/${id}_${photoCount[id]}img.jpeg`, err => {
            err && reject(err);
            photoCount[id] += 1;
            resolve(true)
        })
    })
}

exports.sendDataToClients = sendDataToClients;
exports.getUsersAsync = getUsersAsync;
exports.getMessagesAsync = getMessagesAsync;
exports.unlinkOldImg = unlinkOldImg;
exports.writeImgAsync = writeImgAsync;
