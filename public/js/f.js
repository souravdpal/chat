const socket = io('/'); // Connect to default namespace
window.socket = socket; // Store globally for other scripts
const userName = localStorage.getItem("user");
const frInput = document.getElementById("add");
const addBtn = document.getElementById("add-btn");
const searchInput = document.getElementById("search");
const listContainer = document.getElementById("list");
const optionsModal = document.getElementById("options-modal");
const friendNameEl = document.getElementById("friend-name");
const callBtn = document.getElementById("call-btn");
const textBtn = document.getElementById("text-btn");
const closeBtn = document.getElementById("close-btn");

let friends = [];

// Initialize socket
function initSocket() {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    socket.emit('auth', { user: userName });
    setupSocketEvents();
    fetchFriends();
    updateFriendStatuses(); // Initial status update
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

  socket.on('incomingRequest', (data) => {
    const { from, mode } = data;
    console.log(`Incoming ${mode} request from ${from}`);
    if (mode === 'call') {
      const modal = document.createElement('div');
      modal.id = 'call-modal';
      modal.style.position = 'fixed';
      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.background = 'white';
      modal.style.padding = '20px';
      modal.style.borderRadius = '5px';
      modal.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
      modal.style.zIndex = '1000';
      modal.innerHTML = `
        <p>${from} is calling you!</p>
        <button id="accept-call" style="margin: 10px; padding: 10px 20px; border: none; border-radius: 5px; background: #34d399; color: white; cursor: pointer;">Accept</button>
        <button id="reject-call" style="margin: 10px; padding: 10px 20px; border: none; border-radius: 5px; background: #f43f5e; color: white; cursor: pointer;">Reject</button>
      `;
      document.body.appendChild(modal);
      document.getElementById('accept-call').onclick = () => {
        console.log(`Accepting call from ${from}`);
        document.body.removeChild(modal);
        setTimeout(() => {
          window.location.href = `call.html?to=${encodeURIComponent(from)}&opcode=true`;
        }, 100);
      };
      document.getElementById('reject-call').onclick = () => {
        console.log(`Rejecting call from ${from}`);
        document.body.removeChild(modal);
        socket.emit('endCall', { from: userName, to: from });
      };
    } else {
      alert(`${from} wants to ${mode} you!`);
      window.location.href = `${mode}.html?to=${encodeURIComponent(from)}`;
    }
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
  listContainer.innerHTML = ''; // Clear loading message
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
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
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
        alert(data.message);
        if (data.message.includes('Connecting')) {
          window.location.href = `text.html?to=${encodeURIComponent(friend)}`;
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

