// Initialize socket or use shared socket
const socket = window.socket || io('/'); // Requires <script src="/socket.io/socket.io.js"></script>
const user = localStorage.getItem('user');
const name1 = localStorage.getItem('name');
const ins = document.getElementById('here'); // Chat container
const form = document.getElementById('btn'); // Send button
const input = document.getElementById('take'); // Message input
const joiner = document.getElementById('join'); // Join message container

// Validate DOM elements
if (!ins || !form || !input || !joiner) {
  console.error('Missing DOM elements:', { ins, form, input, joiner });
  alert('Page setup error. Please check the HTML structure.');
  throw new Error('Missing required DOM elements');
}

// Add verified users (case-insensitive)
const verifiedUsers = ['~hina', '~sourav'];

// Replace {user} or {users} with name1, and {{//any_word}} with a link to home.html
function filterPlaceholders(text) {
  if (!text || typeof text !== 'string') return '';
  
  const username = name1 || 'Unknown';

  // Replace {user} or {users}
  let result = text.replace(/{users?}/gi, username);

  // Replace {{//text//}} → link to /home
  result = result.replace(/\{\{\/\/([^\}]+)\}\}/g, (match, p1) => {
    const sanitizedText = p1.replace(/[<>&"']/g, (char) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    })[char] || char);
    return `<a href="/home" target="_blank">${sanitizedText}</a>`;
  });

  // Replace //text// → link to /f
  result = result.replace(/\/\/(.*?)\/\//g, (match, p1) => {
    const sanitizedText = p1.replace(/[<>&"']/g, (char) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;'
    })[char] || char);
    return `<a href="/f" target="_blank">${sanitizedText}</a>`;
  });

  return result;
}

// Render username with verified badge if applicable
function renderUsername(username) {
  if (!username) {
    console.error('Username is undefined or null:', username);
    return `<span><strong>Unknown</strong></span>`;
  }
  const normalizedUsername = username.trim().toLowerCase();
  const isVerified = verifiedUsers.includes(normalizedUsername);
  const unverifiedUsers = []; // Add usernames to exclude from badge
  const showBadge = isVerified && !unverifiedUsers.includes(normalizedUsername);
  const imagePath = 'h.png'; // Verified badge image
  console.log(`[renderUsername] Username: "${username}", Normalized: "${normalizedUsername}", Is Verified: ${isVerified}, Show Badge: ${showBadge}`);
  return showBadge
    ? `<span class="verified-user">${username}<img src="${imagePath}" alt="Verified" class="verified-emoji" style="width:20px;height:20px;vertical-align:middle;margin-bottom:2px;"></span>`
    : `<span><strong>${username}</strong></span>`;
}

// Display a message in the chat UI
function showMessage(data, type) {
  if (!data.sender) {
    console.error('Missing sender in message data:', data);
    return;
  }
  const text = filterPlaceholders(data.text || '');
  const nameHTML = renderUsername(data.sender);
  const formattedTime = formatTime(new Date(data.timestamp || Date.now()));
  
  const messageElement = document.createElement('div');
  messageElement.className = `message ${type}`;
  messageElement.innerHTML = `
    <div>${nameHTML} <small>${formattedTime}</small></div>
    <div>${text}</div>
  `;
  
  ins.appendChild(messageElement);
  ins.scrollTop = ins.scrollHeight;
}

// Convert timestamp to 12-hour format
function formatTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

// Initialize socket and set up event listeners
function initSocket() {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    socket.emit('auth', { user });
    fetchFriendRequests();
    startPolling(); // Start polling as fallback
  });

  socket.on('reconnect', (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit('auth', { user });
    fetchFriendRequests();
    startPolling();
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err);
  });

  socket.on('error', ({ message }) => {
    console.error('Server error:', message);
    alert(`Error: ${message}`);
  });

  socket.on('friendRequest', ({ from }) => {
    console.log(`New friend request from ${from}`);
    addFriendRequest(from);
  });

  socket.on('friendRequestAccepted', ({ from }) => {
    alert(`${from} has accepted your friend request!`);
  });

  socket.on('world message', (msg) => {
    console.log('New world message received:', msg);
    showMessage(
      {
        sender: msg.username,
        text: msg.message,
        timestamp: msg.timestamp,
      },
      msg.username === user ? 'user' : 'other'
    );
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
        socket.emit('endCall', { from: user, to: from });
      }
    }
  });
}

// Add friend request to UI with verified badge
function addFriendRequest(fr1) {
  const requestId = `req-${fr1.replace(/\s+/g, '_')}`;
  if (document.getElementById(requestId)) return;

  const acceptId = `accept-${fr1.replace(/\s+/g, '_')}`;
  const rejectId = `reject-${fr1.replace(/\s+/g, '_')}`;

  const requestElement = document.createElement('div');
  requestElement.className = 'cleaner';
  requestElement.id = requestId;
  requestElement.innerHTML = `
    <div class="friend-request">
      <span>${renderUsername(fr1)} sent you a friend request.</span>
      <div>
        <button class="btn-accept" id="${acceptId}">Accept</button>
        <button class="btn-reject" id="${rejectId}">Reject</button>
      </div>
    </div>
  `;

  ins.appendChild(requestElement);

  setTimeout(() => {
    const acceptBtn = document.getElementById(acceptId);
    const rejectBtn = document.getElementById(rejectId);
    
    if (acceptBtn) {
      acceptBtn.addEventListener('click', async () => {
        try {
          const res = await fetch('/fr_response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept', from: fr1, to: user }),
          });
          const data = await res.json();
          if (res.ok) {
            alert(`Accepted friend request from ${fr1}.`);
            document.getElementById(requestId)?.remove();
            socket.emit('friendRequestAccepted', { from: user, to: fr1 });
          } else {
            throw new Error(data.message || 'Failed to accept friend request');
          }
        } catch (err) {
          console.error('Error accepting friend request:', err);
          alert('Failed to accept friend request.');
        }
      });
    }
    
    if (rejectBtn) {
      rejectBtn.addEventListener('click', async () => {
        try {
          const res = await fetch('/fr_response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', from: fr1, to: user }),
          });
          const data = await res.json();
          if (res.ok) {
            alert(`Rejected friend request from ${fr1}.`);
            document.getElementById(requestId)?.remove();
          } else {
            throw new Error(data.message || 'Failed to reject friend request');
          }
        } catch (err) {
          console.error('Error rejecting friend request:', err);
          alert('Failed to reject friend request.');
        }
      });
    }
  }, 0);
}

// Fetch friend requests
async function fetchFriendRequests() {
  try {
    const response = await fetch(`/fr_requests?user=${encodeURIComponent(user)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (response.ok && Array.isArray(data.requests)) {
      data.requests.forEach((fr) => addFriendRequest(fr));
    } else {
      console.error('Invalid friend requests response:', data);
    }
  } catch (err) {
    console.error('Error fetching friend requests:', err);
  }
}

// Polling for new messages (fallback)
let pollingActive = false;
let pollInterval = null;

function startPolling() {
  if (pollingActive) return;
  pollingActive = true;
  
  pollInterval = setInterval(async () => {
    try {
      // No need to fetch chat history for world chat as it's not persistent
      console.log('Polling for new messages...');
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 30000); // Poll every 30 seconds
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected, stopping polling');
    if (pollInterval) {
      clearInterval(pollInterval);
      pollingActive = false;
    }
  });
}

// Show join message
joiner.innerHTML = `${filterPlaceholders('{user} joined the world chat!')}`;

// Handle sending messages
if (form) {
  form.addEventListener('click', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) {
      console.log('Empty message, ignoring');
      return;
    }
    const messageData = {
      username: user,
      message: text,
      timestamp: new Date().toISOString(),
    };
    console.log('Sending world message:', messageData);
    try {
      socket.emit('world message', messageData);
      // Show the message immediately in the UI
      showMessage(
        {
          sender: user,
          text: text,
          timestamp: messageData.timestamp,
        },
        'user'
      );
      input.value = '';
    } catch (err) {
      console.error('Error emitting world message:', err);
      alert('Failed to send message.');
    }
  });
}

// Handle Enter key
if (input) {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.click();
    }
  });
}

// Initialize socket
initSocket();

// Test messages (remove in production)
const testMessage = {
  username: '~HINA',
  message: 'Hi i am hina and {users} welcome here! lets all {{//talk}} and enjoy!',
  timestamp: new Date().toISOString()
};
const t1 = {
  username: '~sourav',
  message: 'hey guys welcome to the world chat where anyone can connect without any problem talk anyone and make //friend//!',
  timestamp: new Date().toISOString()
};

// Show test messages after a short delay
setTimeout(() => {
  showMessage({ 
    sender: testMessage.username, 
    text: testMessage.message, 
    timestamp: testMessage.timestamp 
  }, 'other');
  
  showMessage({ 
    sender: t1.username, 
    text: t1.message, 
    timestamp: t1.timestamp 
  }, 'other');
}, 1000);
