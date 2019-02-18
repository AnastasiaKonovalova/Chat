import getMessageHTML from './templates/message.hbs';
import getAuthHTML from './templates/auth.hbs';
import getLoadAvatarHTML from './templates/load-avatar.hbs';
import './style.scss';

const asideUserName = document.querySelector('#asideUserName');
const asideUserPic = document.querySelector('#asideUserPic');
const usersCount = document.querySelector('#usersCount');
const usersList = document.querySelector('#usersList');
const messageList = document.querySelector('#messageList');
const messageInput = document.querySelector('#messageInput');
const sendBtn = document.querySelector('#sendBtn');

class UploadImgForm {
    constructor() {
        this.imgFile;
        this.dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
    }

    render () {
        const loadPhotoHTML = getLoadAvatarHTML();
        const div = document.createElement('div');
    
        div.className = 'popup__container';
        div.innerHTML = loadPhotoHTML;
        div.id = 'uploadImgPopup';
        document.body.appendChild(div);

        this.handlePreviewAndUpload()
    }

    handlePreviewAndUpload () {
        const dropZone = document.querySelector('#dropZone');
        const uploadImgPopup = document.querySelector('#uploadImgPopup');
    
        this.dragEvents.forEach(eventName => {
            dropZone.addEventListener(eventName, e => e.preventDefault())
        });
        dropZone.addEventListener('drop', e => this.handleDrop(e)(dropZone), false);
    
        uploadImgPopup.addEventListener('click', e => {
            const targetBtn = e.target;
            
            if (targetBtn.id === 'cancel') {
                document.body.removeChild(uploadImgPopup)
            }
            if (targetBtn.id === 'load' && this.imgFile) {
                app.socket.send(this.imgFile);
                document.body.removeChild(uploadImgPopup)
            }
        })
    }

    handleDrop (e) {
        return (zone) => {
            const imgFile = e.dataTransfer.files[0];
            const reader = new FileReader();
        
            if (imgFile) {
                if (imgFile.size > 512000) {
                    alert('Размер файла не должен превышать 512 Кб');

                    return;
                }
                if (imgFile.type !== 'image/jpeg') {
                    alert('Формат файла должен быть jpeg');

                    return;
                }
        
                zone.innerHTML = '';
                reader.readAsDataURL(imgFile);
                reader.addEventListener('load', e => {
                    zone.style.background = `url(${reader.result}) 50% 50%/cover no-repeat`
                });
                this.imgFile = imgFile;
            }
        };
    } 
}

class AuthForm {
    constructor() {
        this.form;
        this.root;
    }

    render() {
        const authHTML = getAuthHTML();
        const div = document.createElement('div');
    
        div.classList.add('auth__container');
        div.id = 'authContainer';
        div.innerHTML = authHTML;
        document.body.appendChild(div);
        this.root = div;
        this.form = document.querySelector('#authForm')
        this.handleEvents()
    }

    handleEvents() {
        this.root.addEventListener('click', e => {
            if (e.target.id === 'authBtn') {
                e.preventDefault();
                const userName = this.form.fullName.value;
                const userNik = this.form.nikName.value;

                if ( /[^\dA-Z_]/gi.test(userNik) ) {
                    alert('Ник должен состоять из латинских букв, цифр или _');

                    return
                }
                if (userName.trim() === '' || userNik.trim() === '') {
                    alert('Нужно заполнить оба поля');

                    return
                } 
                const user = {
                    id: userNik,
                    fullName: userName,
                    isAuthorized: true,
                };
                const authMessage = {
                    type: 'auth',
                    user: user
                }
        
                app.socket.send(JSON.stringify(authMessage));
                app.setIsAuthorized(true);
                app.userID = user.id;
                asideUserName.textContent = user.fullName;
                document.body.removeChild(this.root)
            }
        });    
    }

}

class App {
    constructor () {
        this.isAuthorized = false;
        this.socket = new WebSocket('ws://localhost:8080');
        this.handleEvents();
        this.userID;
    }

    getIsAuthorized() {
        return this.isAuthorized
    }
    setIsAuthorized(val) {
        if (typeof(val) === typeof(true)) {
            this.isAuthorized = val
        }
    }

    renderMessages(message, users) {
        const { time, text, userID } = message;
        if (users[userID]) {
            // console.log('renderMessages users', users, userID, users[userID])
            const messageHTML = getMessageHTML({ 
                style: `background: url(${users[userID].photo}) 50% 50%/cover no-repeat`,
                time: time, 
                text: text, 
                fullName: users[userID].fullName
            });
            const li = document.createElement('li');
        
            li.innerHTML = messageHTML;
            messageList.appendChild(li);
        }
    }

    renderLastMessage(message) {
        const { time, text, userID, users } = message;
        const messageHTML = getMessageHTML({ 
            style: `background: url(${users[userID].photo}) 50% 50%/cover no-repeat`,
            time: time, 
            text: text, 
            fullName: users[userID].fullName
        });
        const li = document.createElement('li');
    
        li.innerHTML = messageHTML;
        messageList.appendChild(li);
    }

    renderUsers(users) {
        const authorizedUsers = Object.keys(users).filter(user => users[user].isAuthorized === true);
        // console.log('renderUsers users, authorizedUsers', users, authorizedUsers)

        authorizedUsers.forEach(user => {
            const li = document.createElement('li');

            li.classList.add('users__item', 'user');
            li.textContent = users[user].fullName;
            usersList.appendChild(li);
        })
        usersCount.textContent = `Участники (${authorizedUsers.length})`;
    }

    handleEvents() {
        window.addEventListener('beforeunload', e => {
            console.log('beforeunload')
            this.socket.close()
        });
        
        this.socket.onopen = () => {
            console.log("Соединение установлено.");
        };
        
        this.socket.onerror = (error) => {
            console.log("Ошибка " + error.message);
        };
                
        this.socket.onmessage = (e) => {
            let inMessage;
            let messages;
            let users;
            let authorizedUser;

            try {
                inMessage = JSON.parse(e.data);
                messages = inMessage.messages;
                users = inMessage.users;
                authorizedUser = inMessage.authorizedUser;

            } catch (error) {
                alert('Ошибка с JSON');
                console.log('Ошибка с JSON' + error.message)
            }

            if (inMessage) {
                switch (inMessage.type) {
                    case 'message': 
                        // console.log('message act', inMessage)
                        this.renderLastMessage(inMessage)
                        break;
                
                    case 'usersList': 
                        // console.log('usersList act messages, users', messages, users)
                        if (messages && users[this.userID] && users[this.userID].isAuthorized === true) {
                            usersList.innerHTML = '';
                            this.renderUsers(users)
                            if (messages.length > 0) {
                                messageList.innerHTML = '';
                                messages.forEach(message => {
                                    this.renderMessages(message, users)
                                })
                            }
                        }
                        if (authorizedUser && this.userID === authorizedUser.id) {

                            asideUserPic.style.background = `url(${authorizedUser.photo}) 50% 50%/cover no-repeat`;
                        }
                        break;

                    case 'unauthorize':
                        if (users[this.userID] && users[this.userID].isAuthorized === true) {
                            usersList.innerHTML = '';
                            this.renderUsers(users)
                        }
                        break;

                    case 'newUserImg':
                    console.log('newUserImg messages, users, this.userID', messages, users, this.userID)
                        if (messages && users) {
                            asideUserPic.style.background = `url(${users[this.userID].photo}) 50% 50%/cover no-repeat`;
                            console.log('asideUserPic.style.background', asideUserPic.style.background)

                            if (messages.length > 0) {
                                messageList.innerHTML = '';
                                messages.forEach(message => {
                                    this.renderMessages(message, users)
                                })
                            }
                        }
                        break;
                
                    default: 
                        console.log('unknown message.type from server')
                }
            }
        };
    }

}

const app = new App();
const authForm = new AuthForm();
const uploadImgForm = new UploadImgForm();

if (!app.getIsAuthorized()) {
    authForm.render()
}

asideUserPic.addEventListener('click', e => {
    if (!app.getIsAuthorized()) return;
    uploadImgForm.render();
});

const sendMessage = () => {
    if (!app.getIsAuthorized || messageInput.value.trim() === '') {
        // console.log('sendMessage values problem', app.getIsAuthorized, messageInput.value.trim())
        return
    };

    const outMessage = {
        type: 'message',
        userID: app.userID,
        text: messageInput.value
    };

    app.socket.send(JSON.stringify(outMessage));
    messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
        sendMessage()
    }
})