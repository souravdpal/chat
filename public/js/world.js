const socket = window.socket || io('/'); // Use shared socket or create new
const user = localStorage.getItem('user');
const name1 = localStorage.getItem('name');
const ins = document.getElementById('here');
const form = document.getElementById('btn');
const input = document.getElementById('take');
const joiner = document.getElementById('join');

// Redirect if not logged in
if (!user || !name1) {
  alert('Please log in to continue.');
  window.location.href = 'login.html';
}

// Validate DOM elements
if (!ins || !form || !input || !joiner) {
  console.error('Missing DOM elements:', { ins, form, input, joiner });
  alert('Page setup error. Please check the HTML structure.');
}

// Show join message
joiner.innerHTML += `${name1} joined the world chat!`;

// Convert to 12-hour format without seconds
function formatTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

// Initialize socket
function initSocket() {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    socket.emit('auth', { user });
    fetchFriendRequests();
    fetchChatHistory();
  });

  socket.on('reconnect', (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit('auth', { user });
    fetchFriendRequests();
    fetchChatHistory();
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

  socket.on('world message', ({ username, message, timestamp }) => {
    console.log('Received world message:', { username, message, timestamp });
    showMessage({
      sender: username,
      text: message,
      time: formatTime(new Date(timestamp))
    }, username === user ? 'user' : 'other');
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

// Fetch chat history
async function fetchChatHistory() {
  try {
    const url = `/chat_history?type=worldchat&user1=${encodeURIComponent(user)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (response.ok && Array.isArray(data.messages)) {
      ins.innerHTML = `<div class='message other'>${name1} joined the world chat!</div>`;
      data.messages.forEach(msg => {
        if (!msg.reply) { // Exclude wiki responses
          showMessage({
            sender: msg.username,
            text: msg.message,
            time: formatTime(new Date(msg.timestamp))
          }, msg.username === user ? 'user' : 'other');
        }
      });
    } else {
      console.error('Invalid worldchat history response:', data);
    }
  } catch (err) {
    console.error('Error fetching worldchat history:', err);
  }
}

// Show message in UI
function showMessage(data, type) {
  if (!data.sender) {
    console.log('Missing sender in message data:', data);
    return;
  }
  ins.innerHTML += `
    <div class="message ${type}">
      <strong>${data.sender}:</strong> ${data.text}
      <br><small>${data.time}</small>
    </div>
  `;
  ins.scrollTop = ins.scrollHeight;
}

// Add friend request to UI
function addFriendRequest(fr1) {
  const requestId = `req-${fr1.replace(/\s+/g, '_')}`;
  if (document.getElementById(requestId)) return;

  const acceptId = `accept-${fr1.replace(/\s+/g, '_')}`;
  const rejectId = `reject-${fr1.replace(/\s+/g, '_')}`;

  ins.innerHTML += `
    <div class="cleaner" id="${requestId}" style="margin-bottom: 5px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; background-color:rgb(250, 250, 250);">
      <div class="friend-request" style="display: flex; align-items: center; justify-content: space-between; color: #333;">
        <span><strong>${fr1}</strong> sent you a friend request.</span>
        <div>
          <button class="btn-accept" id="${acceptId}" style="background-color: #4CAF50; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px;">Accept</button>
          <button class="btn-reject" id="${rejectId}" style="background-color: #f44336; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Reject</button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const acceptBtn = document.getElementById(acceptId);
    const rejectBtn = document.getElementById(rejectId);
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        fetch('/fr_response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', from: fr1, to: user }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert(`Accepted friend request from ${fr1}.`);
            document.getElementById(requestId)?.remove();
            socket.emit('friendRequestAccepted', { from: user, to: fr1 });
          })
          .catch((err) => {
            console.error('Error accepting friend request:', err);
            alert('Failed to accept friend request.');
          });
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        fetch('/fr_response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', from: fr1, to: user }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert(`Rejected friend request from ${fr1}.`);
            document.getElementById(requestId)?.remove();
          })
          .catch((err) => {
            console.error('Error rejecting friend request:', err);
            alert('Failed to reject friend request.');
          });
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

// Handle sending messages
if (form) {
  form.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Send button clicked');
    const text = input.value.trim();
    if (!text) {
      console.log('Empty message, ignoring');
      return;
    }

    const messageData = {
      username: user,
      message: text,
      timestamp: new Date().toISOString()
    };
    console.log('Sending world message:', messageData);

    // Optimistic UI update
    showMessage({
      sender: user,
      text: text,
      time: formatTime(new Date())
    }, 'user');

    try {
      socket.emit('world message', messageData);
      input.value = '';
    } catch (err) {
      console.error('Error emitting world message:', err);
      alert('Failed to send message.');
    }
  });
} else {
  console.error('Send button (#btn) not found');
}

// Handle Enter key
if (input) {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('Enter key pressed');
      form.click();
    }
  });
}

initSocket();