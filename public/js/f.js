// Initialize Socket.IO
//const socket = io();

// Get username from localStorage
const user_name = localStorage.getItem("user");

// DOM Elements
const frInput = document.getElementById("add");
const addBtn = document.getElementById("add-btn");
const searchInput = document.getElementById("search");
const listContainer = document.getElementById("list");

const optionsModal = document.getElementById("options-modal");
const friendNameEl = document.getElementById("friend-name");
const callBtn = document.getElementById("call-btn");
const textBtn = document.getElementById("text-btn");
const closeBtn = document.getElementById("close-btn");

// State
let friends = [];

// On socket connect, send auth
socket.on("connect", () => {
  socket.emit("auth", { user: user_name });
  socket.emit("chat message2", { user: user_name }); // Ensure status update
});

// Handle server errors
socket.on("error", (data) => {
  console.error("Server error:", data.message);
});

// Listen for incoming requests
socket.on("incoming-request", (data) => {
  const { from, mode } = data;
  alert(`${from} wants to ${mode} you!`);
  // Redirect with recipient as query parameter
  window.location.href = `${mode}.html?to=${encodeURIComponent(from)}`;
});

// Helper: get initials for avatar
function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

// Render friends list with filter
function renderFriends(filter = "") {
  listContainer.innerHTML = "";
  const filtered = friends.filter(friend =>
    friend.toLowerCase().includes(filter.toLowerCase())
  );
  if (filtered.length === 0) {
    listContainer.innerHTML = `<p class="empty-message">No friends found.</p>`;
    return;
  }
  filtered.forEach(friend => {
    const friendDiv = document.createElement("div");
    friendDiv.className = "friend";
    friendDiv.dataset.name = friend;
    friendDiv.innerHTML = `
      <div class="avatar">${getInitials(friend)}</div>
      <span>${friend}</span>
      <div class="status-dot status-offline"></div>
    `;
    friendDiv.addEventListener("click", () => checkAndShowOptions(friend));
    listContainer.appendChild(friendDiv);
  });
  updateFriendStatuses();
}

// Fetch friend list from server
function fetchFriends() {
  fetch("/get_fr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: user_name }),
  })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data.fr)) {
        friends = data.fr;
        renderFriends(searchInput.value);
      } else {
        console.error("Invalid response:", data);
      }
    })
    .catch(err => console.error("Error fetching friends:", err));
}

// Add friend handler
addBtn.addEventListener("click", () => {
  const fr_name = frInput.value.trim();
  if (!fr_name) {
    alert("Oops! You forgot to fill in the friend's name.");
    return;
  }
  if (fr_name === user_name) {
    alert("You can't add yourself as a friend!");
    return;
  }
  if (friends.includes(fr_name)) {
    alert("This friend is already in your list.");
    return;
  }
  fetch("/get/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: user_name, to: fr_name }),
  })
    .then(res => res.json())
    .then(data => {
      alert(data.msg || "Friend request sent!");
      frInput.value = "";
      fetchFriends(); // Refresh friend list
    })
    .catch(() => alert("Failed to send friend request."));
});

// Search input handler
searchInput.addEventListener("input", () => {
  renderFriends(searchInput.value);
});

// Fetch user online status from server
async function fetchUserStatus(username) {
  try {
    const response = await fetch(`/st?user=${encodeURIComponent(username)}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.st === "online";
  } catch {
    return false;
  }
}

// Update status dots on friend list
async function updateFriendStatuses() {
  const friendDivs = listContainer.querySelectorAll(".friend");
  for (const friendDiv of friendDivs) {
    const friend = friendDiv.dataset.name;
    const statusDot = friendDiv.querySelector(".status-dot");
    const isOnline = await fetchUserStatus(friend);
    statusDot.classList.toggle("status-online", isOnline);
    statusDot.classList.toggle("status-offline", !isOnline);
  }
}

// Show popup and handle call/text options
async function checkAndShowOptions(friend) {
  const isOnline = await fetchUserStatus(friend);
  friendNameEl.textContent = friend;
  optionsModal.style.display = "block";

  callBtn.onclick = () => {
    alert(`Calling ${friend}...`);
    optionsModal.style.display = "none";
    fetch(`/user?user=${encodeURIComponent(user_name)}&to=${encodeURIComponent(friend)}&mode=call`)
      .then(res => res.json())
      .then(data => {
        alert(data.msg);
        if (data.msg.includes("Connecting")) {
          window.location.href = `call.html?to=${encodeURIComponent(friend)}`;
        }
      })
      .catch(() => alert("Failed to send call request."));
  };

  textBtn.onclick = () => {
    alert(`Texting ${friend}...`);
    optionsModal.style.display = "none";
    fetch(`/user?user=${encodeURIComponent(user_name)}&to=${encodeURIComponent(friend)}&mode=text`)
      .then(res => res.json())
      .then(data => {
        alert(data.msg);
        if (data.msg.includes("Connecting")) {
          window.location.href = `text.html?to=${encodeURIComponent(friend)}`;
        }
      })
      .catch(() => alert("Failed to send text request."));
  };
}

// Close popup on cross click
closeBtn.onclick = () => {
  optionsModal.style.display = "none";
};

// Close popup when clicking outside
window.onclick = (event) => {
  if (event.target === optionsModal) {
    optionsModal.style.display = "none";
  }
};

// Initial fetch and periodic update
fetchFriends();
setInterval(updateFriendStatuses, 5000); // every 5 seconds