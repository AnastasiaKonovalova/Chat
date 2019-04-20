# Чат

По умолчанию проект нужно открывать по этому адресу: http://localhost:8080/chat.html

Доступный функционал:

- Реализована упрощенная авторизация (пароля нет, идентификатором является ник)
- Пользователь может установить аватар с помощью HTML5 File API
- При повторном входе с тем же ником, пользователь получает историю сообщений
- Работа с сетью - WebSoсket протокол

## Технологии

- JavaScript
- Node.js
- Handlebars
- SCSS
- HTML5 File API
- HTML5 dnd API
- WebSoсket (на сервере библиотека ws, на клиенте нативный API)

## Старт проекта

### Склонируйте репозиторий и перейдите в папку проекта

git clone https://github.com/AnastasiaKonovalova/Chat

### Установите модули локально

npm install | yarn install

### Запустите сервер из папки server

cd server
node server.js

### Запустите сборку проекта

npm start | yarn start
