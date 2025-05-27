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

// Add message to chat
function addMessage(text, isUser, from) {
  const message = document.createElement('div');
  message.classList.add('message', isUser ? 'user' : 'other');
  message.textContent = text;
  message.setAttribute('data-time', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send private message
function sendPrivateMessage() {
  const text = messageInput.value.trim();
  if (!text) return alert('Please type a message.');
  if (!recipient) return window.location.href = 'friends.html';
  if (!userName) return window.location.href = 'login.html';

  socket.emit('privateMessage', {
    from: userName,
    to: recipient,
    message: text,
  });
  messageInput.value = '';
}

// Socket Events
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  socket.emit('auth', { user: userName });
  socket.emit('chat message2', { user: userName });
});

socket.on('reconnect', (attempt) => {
  console.log(`✅ Reconnected after ${attempt} attempts`);
  socket.emit('auth', { user: userName });
  socket.emit('chat message2', { user: userName });
});

socket.on('privateMessage', ({ from, message, isSender }) => {
  if (from === recipient || isSender) {
    addMessage(message, isSender, from);
  }
});

socket.on('error', (data) => {
  console.error('Server error:', data.message);
  alert(data.message);
});

socket.on('incomingRequest', ({ from, mode }) => {
  if (mode === 'text') {
    alert(`${from} wants to chat with you!`);
    localStorage.setItem('chat_with', from);
    recipientNameEl.textContent = from;
    recipientAvatarEl.textContent = from.slice(0, 2).toUpperCase();
  }
});

// Event listeners
sendBtn.addEventListener('click', sendPrivateMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendPrivateMessage();
});