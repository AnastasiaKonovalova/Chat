import { path } from 'ramda';
import getMessageHTML from '../templates/message.hbs';

const usersCount = document.querySelector('#usersCount');
const usersList = document.querySelector('#usersList');
const messageList = document.querySelector('#messageList');
const asideUserPic = document.querySelector('#asideUserPic');

export default class App {
    constructor () {
        this.isAuthorized = false;
        this.socket = new WebSocket('ws://localhost:8081');
        this.handleEvents();
        this.userID;
    }

    get IsAuthorized() {
        return this.isAuthorized
    }
    set IsAuthorized(val) {
        if (typeof(val) === typeof(true)) {
            this.isAuthorized = val
        }
    }

    renderMessages(message, users) {
        const { time, text, userID } = message;

        if (users[userID]) {
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

        authorizedUsers.forEach(user => {
            const li = document.createElement('li');

            li.classList.add('users__item', 'user');
            li.textContent = users[user].fullName;
            usersList.appendChild(li);
        })
        usersCount.textContent = `Участники (${authorizedUsers.length})`;
    }

    handleEvents() {
        window.addEventListener('beforeunload', () => {
            console.log('beforeunload')
            this.socket.close()
        });
        
        this.socket.onopen = () => {
            console.log('Соединение установлено.');
        };
        
        this.socket.onerror = (error) => {
            console.log('Ошибка ' + error.message);
        };
                
        this.socket.onmessage = (e) => {
            let serverResponse;
            let messages;
            let users;
            let authorizedUser;

            try {
                serverResponse = JSON.parse(e.data);
                messages = serverResponse.messages;
                users = serverResponse.users;
                authorizedUser = serverResponse.authorizedUser;

            } catch (error) {
                alert('Ошибка с JSON');
                console.log('Ошибка с JSON' + error.message)
            }

            if (serverResponse) {
                switch (serverResponse.type) {
                    case 'message': 
                        this.renderLastMessage(serverResponse)
                        break;
                
                    case 'usersList': 
                        if (messages && path([`${this.userID}`, 'isAuthorized'], users)) {
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
                        if ( path([`${this.userID}`, 'isAuthorized'], users) ) {
                            usersList.innerHTML = '';
                            this.renderUsers(users)
                        }
                        break;

                    case 'newUserImg':
                        if (messages && users) {
                            asideUserPic.style.background = `url(${users[this.userID].photo}) 50% 50%/cover no-repeat`;
                            if (messages.length > 0) {
                                messageList.innerHTML = '';
                                messages.forEach(message => {
                                    this.renderMessages(message, users)
                                })
                            }
                        }
                        break;
                
                    default: 
                        console.log('unknown message.type from server', serverResponse)
                }
            }
        };
    }

}
