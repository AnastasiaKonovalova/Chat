import AuthForm from './components/AuthForm';
import UploadImgForm from './components/UploadImgForm';
import App from './components/App';
import './style.scss';

const asideUserPic = document.querySelector('#asideUserPic');
const messageInput = document.querySelector('#messageInput');
const sendBtn = document.querySelector('#sendBtn');

const app = new App();
const authForm = new AuthForm(app);
const uploadImgForm = new UploadImgForm(app);

if (!app.IsAuthorized) {
    authForm.render()
}

asideUserPic.addEventListener('click', () => {
    if (!app.IsAuthorized) {
        return
    }
    uploadImgForm.render();
});

const sendMessage = () => {
    if (!app.IsAuthorized || messageInput.value.trim() === '') {
        return
    }

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