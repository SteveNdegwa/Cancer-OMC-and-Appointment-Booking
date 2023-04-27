const socket = io();

socket.on('message', (message) => {
    console.log(message);
    displayMessage(message);
})

socket.on('sentChatMessage', (message,user,time) => {
    console.log(message);
    displaySentChatMessage(message,user,time);
})

socket.on('receivedChatMessage', (message,user,time) => {
    console.log(message);
    displayReceivedChatMessage(message,user,time);
})

socket.on('retrieveSentChats', (message,time) => {
    displaySentChats(message,time);
})

socket.on('retrieveReceivedChats', (message,user,time) => {
    displayReceivedChats(message,user,time);
})

let displayMessage = (msg) => {
    const div = document.createElement('div');
    div.className = "message-wrap";
    const p = document.createElement('p');
    p.innerHTML = msg;
    p.className = "message";

    div.append(p);

    const messagesContainer = document.getElementById("messages-container");
    messagesContainer.appendChild(div);

}

let displaySentChatMessage = (msg,time) => {
    const div = document.createElement('div');
    const p = document.createElement('p');
    const t = document.createElement('p');
    const name = document.createElement('p');
    name.innerText = "You";
    t.innerText = time;
    p.innerText = msg;
    div.className = "send-message-div";
    p.className = "send-message-p";
    t.className = "send-time";
    name.className = "send-name";

    div.append(name);
    div.append(p);
    div.append(t);


    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.appendChild(div);

}

let displayReceivedChatMessage = (msg,user,time) => {
  
    const div = document.createElement('div');
    const p = document.createElement('p');
    const t = document.createElement('p');
    const name = document.createElement('p');
    name.innerText = user;
    t.innerText = time;
    p.innerText = msg;
    div.className = "receive-message-div";
    p.className = "receive-message-p";
    name.className = "receive-name";
    t.className = "receive-time";

    div.append(name);
    div.append(p);
    div.append(t);


    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.appendChild(div);

}

let displaySentChats = (msg,timee) => {
  
    const div = document.createElement('div');
    const p = document.createElement('p');
    const name = document.createElement('p');
    const time = document.createElement('p');
    name.innerText = "You";
    time.innerText = timee;
    p.innerText = msg;
    div.className = "send-message-div";
    p.className = "send-message-p";
    name.className = "send-name";
    time.className = "send-time";

    div.append(name);
    div.append(p);
    div.append(time);


    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.appendChild(div);
}

let displayReceivedChats = (msg,user,timee) => {
  
    const div = document.createElement('div');
    const p = document.createElement('p');
    const name = document.createElement('p');
    const time = document.createElement('p');
    time.innerText = timee;
    name.innerText = user;
    p.innerText = msg;
    div.className = "receive-message-div";
    p.className = "receive-message-p";
    name.className = "receive-name";
    time.className = "receive-time";

    div.append(name);
    div.append(p);
    div.append(time);


    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.appendChild(div);

}



const messageBtn = document.getElementById('message-btn');
messageBtn.addEventListener('click', () => {

    let d = new Date();

    let time =("0"+d.getHours()).slice(-2) +":"+("0"+d.getMinutes()).slice(-2);
    let date =("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + d.getFullYear();
    const messageField = document.getElementById('message');
    let message = messageField.value;

    socket.emit('sentChatMessage', message,date,time);
    socket.emit('receivedChatMessage', message,date,time);
})

const roomBtn = document.getElementById('room-btn');
roomBtn.addEventListener('click', () => {
    const roomField = document.getElementById('room');
    let room = roomField.value;
})