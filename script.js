document.getElementById('enter-chat').onclick = function() {
    const username = document.getElementById('username').value;
    if (username) {
        localStorage.setItem('username', username);
        document.getElementById('welcome').style.display = 'none';
        document.getElementById('sidebar').style.display = 'flex';
        document.getElementById('chat-container').style.display = 'flex';
        initChat(username);
    }
};

function initChat(username) {
    const ably = new Ably.Realtime('n7Lamg.ZtRXGw:-5YpSYMXxSQXXAjbZX-ZQTDPUYHA4rTrUUQ36jDLgbY');
    let currentChannel = 'general';
    let messageHistory = JSON.parse(localStorage.getItem('messageHistory')) || {};
    let isClearing = false;

    const channel = ably.channels.get(currentChannel);

    // Подгружаем сохраненные сообщения
    if (messageHistory[currentChannel]) {
        messageHistory[currentChannel].forEach(msg => {
            displayMessage(msg.name, msg.message, msg.isImage, msg.isSVG);
        });
    }

    channel.subscribe('message', function(message) {
        if (message.data.message === 'Чат был очищен' && message.data.name === 'System') {
            isClearing = true;
            document.getElementById('messages').innerHTML = '';
            messageHistory[currentChannel] = [];
            localStorage.setItem('messageHistory', JSON.stringify(messageHistory));
            displayMessage(message.data.name, message.data.message, false, false);
            setTimeout(() => isClearing = false, 1000); // Блокировка отправки сообщений на секунду
        } else {
            displayMessage(message.data.name, message.data.message, message.data.isImage, message.data.isSVG);
            saveMessage(currentChannel, message.data.name, message.data.message, message.data.isImage, message.data.isSVG);
        }
    });

    document.getElementById('send-message').onclick = function() {
        if (isClearing) return; // Блокировка отправки сообщений

        const messageText = document.getElementById('message-input').value;
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];

        if (messageText === '/delete') {
            const messageData = { name: 'System', message: 'Чат был очищен', isImage: false, isSVG: false };
            channel.publish('message', messageData);
        } else if (messageText === '/name') {
            localStorage.removeItem('username');
            location.reload();
        } else if (file) {
            const reader = new FileReader();
            reader.onload = function() {
                const base64String = reader.result.split(',')[1];
                const isSVG = file.type === 'image/svg+xml';
                const messageData = { name: username, message: base64String, isImage: !isSVG, isSVG: isSVG };
                channel.publish('message', messageData, function(err) {
                    if (err) {
                        console.error('Unable to publish message; err = ' + err.message);
                    } else {
                        fileInput.value = '';
                        displayMessage(username, base64String, !isSVG, isSVG);
                        saveMessage(currentChannel, username, base64String, !isSVG, isSVG);
                    }
                });
            };
            reader.readAsDataURL(file);
        } else if (messageText) {
            const messageData = { name: username, message: messageText, isImage: false, isSVG: false };
            channel.publish('message', messageData, function(err) {
                if (err) {
                    console.error('Unable to publish message; err = ' + err.message);
                } else {
                    document.getElementById('message-input').value = '';
                }
            });
        }
    };

    document.getElementById('channels-list').addEventListener('click', function(e) {
        if (e.target.tagName === 'LI') {
            const newChannel = e.target.getAttribute('data-channel');
            if (newChannel !== currentChannel) {
                currentChannel = newChannel;
                document.getElementById('current-channel').textContent = e.target.textContent;
                document.getElementById('messages').innerHTML = '';

                if (messageHistory[currentChannel]) {
                    messageHistory[currentChannel].forEach(msg => {
                        displayMessage(msg.name, msg.message, msg.isImage, msg.isSVG);
                    });
                }

                channel.unsubscribe();
                const newAblyChannel = ably.channels.get(currentChannel);

                newAblyChannel.subscribe('message', function(message) {
                    if (message.data.message === 'Чат был очищен' && message.data.name === 'System') {
                        isClearing = true;
                        document.getElementById('messages').innerHTML = '';
                        messageHistory[currentChannel] = [];
                        localStorage.setItem('messageHistory', JSON.stringify(messageHistory));
                        displayMessage(message.data.name, message.data.message, false, false);
                        setTimeout(() => isClearing = false, 1000);
                    } else {
                        displayMessage(message.data.name, message.data.message, message.data.isImage, message.data.isSVG);
                        saveMessage(currentChannel, message.data.name, message.data.message, message.data.isImage, message.data.isSVG);
                    }
                });
            }
        }
    });

    function displayMessage(name, message, isImage, isSVG) {
        const messageElement = document.createElement('div');
        if (isImage) {
            const img = document.createElement('img');
            img.src = `data:image/jpeg;base64,${message}`;
            img.style.maxWidth = '400px';
            img.style.borderRadius = '5px';
            messageElement.appendChild(img);
        } else if (isSVG) {
            const svg = atob(message);
            messageElement.innerHTML = svg;
        } else {
            messageElement.textContent = `${name}: ${message}`;
        }
        document.getElementById('messages').appendChild(messageElement);
    }

    function saveMessage(channel, name, message, isImage, isSVG) {
        if (!messageHistory[channel]) {
            messageHistory[channel] = [];
        }
        messageHistory[channel].push({ name, message, isImage, isSVG });
        localStorage.setItem('messageHistory', JSON.stringify(messageHistory));
    }
}

// Проверяем, есть ли сохраненное имя пользователя
window.onload = function() {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        document.getElementById('welcome').style.display = 'none';
        document.getElementById('sidebar').style.display = 'flex';
        document.getElementById('chat-container').style.display = 'flex';
        initChat(savedUsername);
    }
}
