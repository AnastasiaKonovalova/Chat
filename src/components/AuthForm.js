import getAuthHTML from '../templates/auth.hbs';

export default class AuthForm {
    constructor(app) {
        this.form;
        this.root;
        this.app = app;
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
        
                this.app.socket.send(JSON.stringify(authMessage));
                this.app.IsAuthorized = true;
                this.app.userID = user.id;
                document.body.removeChild(this.root)
            }
        });    
    }
}
