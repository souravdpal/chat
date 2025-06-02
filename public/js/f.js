const socket = io('/'); // Connect to default namespace
window.socket = socket; // Store globally for other scripts
const userName = localStorage.getItem('user');
const frInput = document.getElementById('add');
const addBtn = document.getElementById('add-btn');
const searchInput = document.getElementById('search');
const listContainer = document.getElementById('list');
const optionsModal = document.getElementById('options-modal');
const friendNameEl = document.getElementById('friend-name');
const callBtn = document.getElementById('call-btn');
const textBtn = document.getElementById('text-btn');
const closeBtn = document.getElementById('close-btn');

let friends = [];

// Initialize socket
function initSocket() {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    socket.emit('auth', { user: userName });
    setupSocketEvents();
    fetchFriends();
    updateFriendStatuses();
  });

  socket.on('reconnect', (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit('auth', { user: userName });
    fetchFriends();
    updateFriendStatuses();
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('error', ({ message }) => {
    console.error('Server error:', message);
    alert(`Error: ${message}`);
  });
}

function setupSocketEvents() {
  socket.on('status update', ({ user, status }) => {
    if (friends.includes(user)) {
      const friendDiv = listContainer.querySelector(`.friend[data-name="${user}"]`);
      if (friendDiv) {
        const statusDot = friendDiv.querySelector('.status-dot');
        statusDot.classList.toggle('status-online', status);
        statusDot.classList.toggle('status-offline', !status);
        console.log(`Status updated for ${user}: ${status ? 'online' : 'offline'}`);
      }
    }
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

  socket.on('friendRequest', ({ from }) => {
    console.log(`New friend request from ${from}`);
    fetchFriends();
  });

  socket.on('friendRequestAccepted', ({ from }) => {
    alert(`${from} has accepted your friend request!`);
    fetchFriends();
  });
}

function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

function renderFriends(filter = '') {
  listContainer.innerHTML = '<p class="loading-message">Loading friends...</p>';
  const filtered = friends.filter((friend) =>
    friend.toLowerCase().includes(filter.toLowerCase())
  );
  if (filtered.length === 0) {
    listContainer.innerHTML = `<p class="empty-message">No friends found.</p>`;
    return;
  }
  listContainer.innerHTML = '';
  filtered.forEach((friend) => {
    const friendDiv = document.createElement('div');
    friendDiv.className = 'friend';
    friendDiv.dataset.name = friend;
    friendDiv.innerHTML = `
      <div class="avatar">${getInitials(friend)}</div>
      <span>${friend}</span>
      <div class="status-dot status-offline"></div>
    `;
    friendDiv.addEventListener('click', () => checkAndShowOptions(friend));
    listContainer.appendChild(friendDiv);
  });
  updateFriendStatuses();
}

function fetchFriends() {
  fetch(`/friends?user=${encodeURIComponent(userName)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    })
    .then((data) => {
      if (Array.isArray(data.friends)) {
        friends = data.friends;
        console.log('Friends fetched:', friends);
        renderFriends(searchInput.value);
      } else {
        console.error('Invalid friends response:', data);
        listContainer.innerHTML = `<p class="empty-message">Failed to load friends.</p>`;
      }
    })
    .catch((err) => {
      console.error('Error fetching friends:', err);
      listContainer.innerHTML = `<p class="empty-message">Error fetching friends. Please try again.</p>`;
    });
}

addBtn.addEventListener('click', () => {
  const frName = frInput.value.trim();
  if (!frName) {
    alert('Please enter a friend\'s name.');
    return;
  }
  if (frName === userName) {
    alert('You can\'t add yourself as a friend!');
    return;
  }
  if (friends.includes(frName)) {
    alert('This friend is already in your list.');
    return;
  }
  fetch('/friend_request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: userName, to: frName }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message || 'Friend request sent!');
      frInput.value = '';
      fetchFriends();
    })
    .catch(() => alert('Failed to send friend request.'));
});

let debounceTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    renderFriends(searchInput.value);
  }, 300);
});

async function fetchUserStatus(username) {
  try {
    const response = await fetch(`/status?user=${encodeURIComponent(username)}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'online';
  } catch {
    return false;
  }
}

async function checkAndShowOptions(friend) {
  const isOnline = await fetchUserStatus(friend);
  friendNameEl.textContent = friend;
  optionsModal.style.display = 'block';

  callBtn.onclick = () => {
    if (!isOnline) {
      alert(`${friend} is offline.`);
      optionsModal.style.display = 'none';
      return;
    }
    console.log(`Initiating call to ${friend}`);
    optionsModal.style.display = 'none';
    fetch(`/initiate?user=${encodeURIComponent(userName)}&to=${encodeURIComponent(friend)}&mode=call`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message.includes('Connecting')) {
          window.location.href = `call.html?to=${encodeURIComponent(friend)}`;
        } else {
          alert(data.error);
        }
      })
      .catch(() => alert('Failed to initiate call.'));
  };

  textBtn.onclick = () => {
    console.log(`Initiating text to ${friend}`);
    optionsModal.style.display = 'none';
    fetch(`/initiate?user=${encodeURIComponent(userName)}&to=${encodeURIComponent(friend)}&mode=text`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message.includes('Connecting')) {
          window.location.href = `text.html?to=${encodeURIComponent(friend)}`;
        } else {
          alert(data.error);
        }
      })
      .catch(() => alert('Failed to send text request.'));
  };
}

closeBtn.onclick = () => {
  console.log('Closing options modal');
  optionsModal.style.display = 'none';
};

window.onclick = (event) => {
  if (event.target === optionsModal) {
    optionsModal.style.display = 'none';
    console.log('Closed modal via outside click');
  }
};

async function updateFriendStatuses() {
  if (friends.length === 0) return;
  try {
    const response = await fetch('/batch_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: friends }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { statuses } = await response.json();
    const friendDivs = listContainer.querySelectorAll('.friend');
    for (const friendDiv of friendDivs) {
      const friend = friendDiv.dataset.name;
      const statusDot = friendDiv.querySelector('.status-dot');
      const isOnline = statuses[friend] === 'online';
      statusDot.classList.toggle('status-online', isOnline);
      statusDot.classList.toggle('status-offline', !isOnline);
    }
  } catch (err) {
    console.error('Error updating friend statuses:', err);
  }
}

// Initialize
if (!userName) {
  alert('Please log in to continue.');
  window.location.href = 'login.html';
} else {
  initSocket();
}