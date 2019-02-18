import getLoadAvatarHTML from '../templates/load-avatar.hbs';

export default class UploadImgForm {
    constructor(app) {
        this.imgFile;
        this.dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
        this.app = app;
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
                this.app.socket.send(this.imgFile);
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
                reader.addEventListener('load', () => {
                    zone.style.background = `url(${reader.result}) 50% 50%/cover no-repeat`
                });
                this.imgFile = imgFile;
            }
        };
    } 
}
