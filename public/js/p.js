const socket = window.socket || io('/'); // Use shared socket or create new

// Get user and recipient
const userName = localStorage.getItem('user');
const urlParams = new URLSearchParams(window.location.search);
const recipient = urlParams.get('to') || localStorage.getItem('chat_with');

// DOM Elements
const recipientNameEl = document.getElementById('recipient-name');
const recipientAvatarEl = document.getElementById('recipient-avatar');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Redirect if no recipient or user
if (!recipient) {
  alert('No recipient specified. Please select a friend to chat with.');
  window.location.href = 'friends.html';
}
if (!userName) {
  alert('Please log in to continue.');
  window.location.href = 'login.html';
}

// Update UI with recipient info
recipientNameEl.textContent = recipient;
recipientAvatarEl.textContent = recipient.slice(0, 2).toUpperCase();
localStorage.setItem('chat_with', recipient);

// Theme handling
const themes = ['light', 'dark'];
let currentThemeIndex = 0;
const savedTheme = localStorage.getItem('theme');
if (savedTheme && themes.includes(savedTheme)) {
  currentThemeIndex = themes.indexOf(savedTheme);
}
document.documentElement.setAttribute('data-theme', themes[currentThemeIndex]);

function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const newTheme = themes[currentThemeIndex];
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Fetch chat history
async function fetchChatHistory() {
  try {
    const url = `/chat_history?type=personalchat&user1=${encodeURIComponent(userName)}&user2=${encodeURIComponent(recipient)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (response.ok && Array.isArray(data.messages)) {
      chatMessages.innerHTML = '';
      data.messages.forEach(msg => addMessage(msg, msg.from === userName));
    } else {
      console.error('Invalid personalchat history response:', data);
    }
  } catch (err) {
    console.error('Error fetching personalchat history:', err);
  }
}

// Add message to chat
function addMessage(msg, isSender) {
  const message = document.createElement('div');
  message.classList.add('message', isSender ? 'user' : 'other');
  const sender = isSender ? userName : msg.from || recipient;
  const content = msg.message || '';
  const timestamp = msg.timestamp 
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  message.innerHTML = `
    <strong>${sender}:</strong> ${content}
    <br><small>${timestamp}</small>
  `;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send private message
function sendPrivateMessage() {
  const text = messageInput.value.trim();
  if (!text) return alert('Please type a message.');
  if (!recipient) return window.location.href = 'friends.html';
  if (!userName) return window.location.href = 'login.html';

  const message = {
    from: userName,
    to: recipient,
    message: text,
    timestamp: new Date().toISOString()
  };
  socket.emit('privateMessage', message);
  //addMessage(message, true);
  messageInput.value = '';
}

// Socket Events
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  socket.emit('auth', { user: userName });
  socket.emit('chat message2', { user: userName });
  fetchChatHistory();
  socket.emit('getOldMessages', { user1: userName, user2: recipient });
});

socket.on('reconnect', (attempt) => {
  console.log(`✅ Reconnected after ${attempt} attempts`);
  socket.emit('auth', { user: userName });
  socket.emit('chat message2', { user: userName });
  fetchChatHistory();
  socket.emit('getOldMessages', { user1: userName, user2: recipient });
});

socket.on('privateMessage', ({ from, message, isSender, timestamp }) => {
  if (from === recipient || isSender) {
    addMessage({ from, message, timestamp }, isSender);
  }
});

socket.on('oldMessages', (messages) => {
  messages.forEach(msg => addMessage(msg, msg.from === userName));
});

socket.on('error', ({ message }) => {
  console.error('Server error:', message);
  alert(message);
});

socket.on('incomingRequest', ({ from, mode }) => {
  if (mode === 'text') {
    if (confirm(`${from} wants to chat with you! Accept?`)) {
      window.location.href = `text.html?to=${encodeURIComponent(from)}`;
    }
  } else if (mode === 'call') {
    if (confirm(`${from} is calling you! Accept?`)) {
      window.location.href = `call.html?to=${encodeURIComponent(from)}&opcode=true`;
    } else {
      socket.emit('endCall', { from: userName, to: from });
    }
  }
});

// Event listeners
sendBtn.addEventListener('click', sendPrivateMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendPrivateMessage();
});